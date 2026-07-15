import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { customerAuthSchema } from "@/schemas/customerSchema";
import {
  generateOtp,
  hashOtp,
  OTP_EXPIRY_MINUTES,
  MAX_RESEND_COUNT,
  RESEND_COOLDOWN_SECONDS,
} from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = customerAuthSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error.issues[0]?.message ?? "Validation failed" },
        { status: 400 },
      );
    }

    const { name, email, phone } = result.data;

    const conflictingEmail = await prisma.customer.findUnique({
      where: { email },
      select: { id: true, phone: true },
    });
    if (conflictingEmail && conflictingEmail.phone !== phone) {
      return NextResponse.json(
        { success: false, message: "This email is already registered with a different phone number" },
        { status: 409 },
      );
    }

    const conflictingPhone = await prisma.customer.findUnique({
      where: { phone },
      select: { id: true, email: true },
    });
    if (conflictingPhone && conflictingPhone.email && conflictingPhone.email !== email) {
      return NextResponse.json(
        { success: false, message: "This phone number is already registered with a different email" },
        { status: 409 },
      );
    }

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const existingOtp = await prisma.emailOtp.findFirst({
      where: { email, createdAt: { gte: oneHourAgo } },
      orderBy: { createdAt: "desc" },
    });

    if (existingOtp) {
      if (existingOtp.resendCount >= MAX_RESEND_COUNT) {
        return NextResponse.json(
          { success: false, message: "Too many OTP requests. Please try again later." },
          { status: 429 },
        );
      }

      const secondsSinceCreated = (now.getTime() - existingOtp.createdAt.getTime()) / 1000;
      if (secondsSinceCreated < RESEND_COOLDOWN_SECONDS && existingOtp.resendCount > 0) {
        const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceCreated);
        return NextResponse.json(
          { success: false, message: `Please wait ${wait} seconds before requesting a new code` },
          { status: 429 },
        );
      }
    }

    await prisma.emailOtp.deleteMany({
      where: { email },
    });

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await prisma.emailOtp.create({
      data: {
        email,
        otpHash,
        expiresAt,
        resendCount: existingOtp ? existingOtp.resendCount + 1 : 0,
      },
    });

    const restaurant = await prisma.restaurant.findFirst({
      select: { restaurantName: true, logoUrl: true, email: true, phone: true },
    });

    await sendOtpEmail({
      to: email,
      otp,
      restaurantName: restaurant?.restaurantName ?? "Our Restaurant",
      logoUrl: restaurant?.logoUrl,
      supportEmail: restaurant?.email,
      phone: restaurant?.phone,
    });

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your email",
      email,
      name,
      phone,
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return NextResponse.json(
      { success: false, message: "Failed to send verification code. Please try again." },
      { status: 500 },
    );
  }
}
