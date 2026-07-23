import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

/**
 * Trilha de Auditoria por Documento Gerado (A1)
 * Registra a auditoria formal no banco de dados quando qualquer
 * documento técnico (Memorial Descritivo, Formulário de Acesso, Proposta) é gerado.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, documentType, templateVersion = '2.0.0', clientName, projectName } = body;

    if (!documentType) {
      return NextResponse.json({ error: 'O tipo do documento é obrigatório.' }, { status: 400 });
    }

    const docLabels: Record<string, string> = {
      MEMORIAL_PDF: 'Memorial Descritivo (PDF)',
      MEMORIAL_DOCX: 'Memorial Descritivo (Word/DOCX)',
      FORMULARIO_PDF: 'Formulário de Acesso à Rede (PDF)',
      FORMULARIO_DOCX: 'Formulário de Acesso à Rede (Word/DOCX)',
      PROPOSTA_PDF: 'Proposta Comercial (PDF)',
    };

    const docLabel = docLabels[documentType] || documentType;
    const targetInfo = clientName ? `Cliente: ${clientName}` : projectName ? `Projeto: ${projectName}` : '';

    const companyId = session.user.role === 'PARTNER' ? session.user.id : session.user.companyId || session.user.id;

    const log = await prisma.auditLog.create({
      data: {
        action: 'DOCUMENT_GENERATED',
        details: `Documento gerado: ${docLabel}. Versão do Template: v${templateVersion}. ${targetInfo}`.trim(),
        userId: session.user.id,
        companyId: companyId,
      }
    });

    return NextResponse.json({ success: true, logId: log.id });
  } catch (error: any) {
    console.error('Erro ao registrar trilha de auditoria de documento:', error);
    return NextResponse.json({ error: 'Falha ao registrar auditoria: ' + (error.message || 'Erro interno.') }, { status: 500 });
  }
}
