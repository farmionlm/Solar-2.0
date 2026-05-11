import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

// GET: Fetch own company settings (or by companyId for technicians)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    // Resolve which user holds the company branding
    const companyUserId = session.user.role === 'PARTNER'
      ? session.user.id
      : session.user.companyId;

    if (!companyUserId) {
      return NextResponse.json({ error: 'Sem empresa vinculada.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: companyUserId },
      select: {
        id: true,
        name: true,
        email: true,
        brandColor: true,
        logoUrl: true,
        companyPhone: true,
        companyWebsite: true,
      }
    });

    if (!user) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

// PATCH: Update own company settings
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role === 'TECHNICIAN') {
      return NextResponse.json({ error: 'Não autorizado. Apenas Parceiros podem alterar as configurações.' }, { status: 403 });
    }

    const body = await request.json();
    const { brandColor, logoUrl, companyPhone, companyWebsite, name } = body;

    const targetId = session.user.role === 'ADMIN'
      ? (body.userId || session.user.id) // ADMIN can edit any user if userId is provided
      : session.user.id;

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(brandColor !== undefined && { brandColor: brandColor || null }),
        ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
        ...(companyPhone !== undefined && { companyPhone: companyPhone?.trim() || null }),
        ...(companyWebsite !== undefined && { companyWebsite: companyWebsite?.trim() || null }),
      },
      select: {
        id: true,
        name: true,
        brandColor: true,
        logoUrl: true,
        companyPhone: true,
        companyWebsite: true,
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
