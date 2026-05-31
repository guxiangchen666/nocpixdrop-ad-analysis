import { NextResponse } from 'next/server';
import { searchBitableRecords } from '../../../../server/feishu/feishuClient';
import { FEISHU_TABLE_FIELD_NAMES } from '../../../../config/feishuFields';

export async function GET() {
  try {
    const appToken = process.env.FEISHU_APP_TOKEN;
    const tableId = process.env.FEISHU_TABLE_AD_CREATIVE_RELATION;
    if (!appToken || !tableId) {
      throw new Error('Missing FEISHU_APP_TOKEN or FEISHU_TABLE_AD_CREATIVE_RELATION.');
    }

    const records = await searchBitableRecords({ appToken, tableId, fieldNames: FEISHU_TABLE_FIELD_NAMES.relations });
    return NextResponse.json({ ok: true, records });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : 'Failed to read Feishu ad-creative relations table.' }, { status: 500 });
  }
}
