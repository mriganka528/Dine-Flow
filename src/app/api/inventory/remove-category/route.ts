import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { deleteFoodImage } from "@/lib/cloudinary"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type CategoryRequestBody = {
    name?: unknown
}

export async function DELETE(request: Request) {
    try {
        const body = (await request.json()) as CategoryRequestBody;
        const name = typeof body.name === "string" ? body.name.trim() : "";

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const category = await prisma.category.findUnique({
            where: {
                name,
            },
        });

        if (!category) {
            return NextResponse.json({ error: "Category was not found" }, { status: 404 });
        }

        const foods = await prisma.food.findMany({
            where: {
                categoryId: category.id,
            },
            select: { imagePublicId: true },
        });

        await prisma.food.deleteMany({
            where: {
                categoryId: category.id,
            },
        });

        // Clean up Cloudinary images for the removed foods (best-effort).
        await Promise.all(foods.map((food) => deleteFoodImage(food.imagePublicId)));

        const deletedCategory = await prisma.category.delete({
            where: {
                id: category.id,
            },
        });

        return NextResponse.json(deletedCategory, { status: 200 });
    } catch (error) {
        console.error("Error deleting category:", error);
        return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
    }
}
