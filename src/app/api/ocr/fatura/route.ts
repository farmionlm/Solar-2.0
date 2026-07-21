import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { parseFaturaTexto } from "@/utils/faturaParser";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';

    let textToParse = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const textInput = formData.get('text') as string | null;

      if (textInput && textInput.trim().length > 0) {
        textToParse = textInput;
      } else if (file) {
        const buffer = Buffer.from(await file.arrayBuffer());

        if (file.name.endsWith('.pdf') || file.type === 'application/pdf') {
          try {
            // Tenta usar pdf-parse para extração serverless de texto PDF
            // Usamos require dinâmico para evitar falha no build se o modulo for importado no browser
            const pdfParse = require('pdf-parse');
            const data = await pdfParse(buffer);
            textToParse = data.text;
          } catch (pdfErr: any) {
            console.warn('pdf-parse fallback text extraction:', pdfErr?.message);
            // Fallback: extração simples de strings UTF-8 do buffer
            textToParse = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r]/g, ' ');
          }
        } else {
          // Arquivo de texto puro ou outro formato
          textToParse = buffer.toString('utf-8');
        }
      }
    } else {
      const body = await request.json();
      textToParse = body.text || '';
    }

    if (!textToParse || textToParse.trim().length < 10) {
      return NextResponse.json({
        error: 'Nenhum texto válido ou conteúdo de fatura PDF foi identificado para leitura.',
      }, { status: 400 });
    }

    const dadosExtraidos = parseFaturaTexto(textToParse);

    return NextResponse.json({
      success: true,
      data: dadosExtraidos,
    });
  } catch (error: any) {
    console.error('Erro ao processar fatura via OCR/PDF:', error);
    return NextResponse.json({
      error: 'Falha ao processar fatura: ' + (error.message || 'Erro interno no servidor.'),
    }, { status: 500 });
  }
}
