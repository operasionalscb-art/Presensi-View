export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export async function listUserSpreadsheets(accessToken: string): Promise<DriveSpreadsheetFile[]> {
  try {
    const q = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime,webViewLink)&pageSize=25&orderBy=modifiedTime desc`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}: Gagal memuat daftar file spreadsheet`);
    }

    const data = await res.json();
    return data.files || [];
  } catch (error: any) {
    console.error('listUserSpreadsheets error:', error);
    throw error;
  }
}

export async function getSpreadsheetDetails(
  spreadsheetId: string,
  accessToken: string
): Promise<{ title: string; sheets: string[] }> {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}: Gagal membuka spreadsheet`);
    }

    const data = await res.json();
    const title = data.properties?.title || 'Spreadsheet Presensi';
    const sheets = (data.sheets || []).map((s: any) => s.properties?.title).filter(Boolean);

    return { title, sheets };
  } catch (error: any) {
    console.error('getSpreadsheetDetails error:', error);
    throw error;
  }
}

export async function fetchSpreadsheetRange(
  spreadsheetId: string,
  sheetName: string,
  accessToken: string
): Promise<any[][]> {
  try {
    // Fetch generous range e.g. SheetName!A1:Z500
    const safeSheetName = sheetName ? `'${sheetName.replace(/'/g, "''")}'` : 'Sheet1';
    const range = `${safeSheetName}!A1:Z500`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}: Gagal membaca data sheet ${sheetName}`);
    }

    const data = await res.json();
    return data.values || [];
  } catch (error: any) {
    console.error('fetchSpreadsheetRange error:', error);
    throw error;
  }
}

export function extractSpreadsheetIdFromUrl(input: string): string {
  const trimmed = input.trim();
  // If it's already an ID
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed;
  }
  // If it's a URL like https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit...
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}
