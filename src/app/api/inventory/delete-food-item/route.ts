import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deleteFoodImage } from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const id = typeof body?.id === 'string' ? body.id : '';

    if (!id) {
      return NextResponse.json({ error: 'Food item id is required' }, { status: 400 });
    }

    const existing = await prisma.food.findUnique({
      where: { id },
      select: { imagePublicId: true },
    });

    await prisma.food.delete({
      where: { id },
    });

    await deleteFoodImage(existing?.imagePublicId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting food item:', error);
    return NextResponse.json({ error: 'Failed to delete food item' }, { status: 500 });
  }
}