export interface MdiSearchResult {
  name: string;
  id: string;
  svgUrl: string;
}

interface IconifySearchResponse {
  icons?: string[];
}

const ICONIFY_API = "https://api.iconify.design";
const MDI_NAME_RX = /^(?:mdi:)?([a-z0-9]+(?:-[a-z0-9]+)*)$/i;

export const normalizeMdiName = (value: string): string | null => {
  const match = value.trim().toLowerCase().match(MDI_NAME_RX);
  return match ? `mdi:${match[1]}` : null;
};

export const mdiSvgUrl = (name: string): string => {
  const normalized = normalizeMdiName(name);
  if (!normalized) {
    throw new Error(`Invalid MDI icon name: ${name}`);
  }
  return `${ICONIFY_API}/mdi/${normalized.slice(4)}.svg`;
};

export const fetchMdiSvg = async (name: string): Promise<{ name: string; svg: string }> => {
  const normalized = normalizeMdiName(name);
  if (!normalized) {
    throw new Error(`Invalid MDI icon name: ${name}`);
  }

  const response = await fetch(mdiSvgUrl(normalized));
  if (!response.ok) {
    throw new Error(`MDI icon not found: ${normalized}`);
  }

  const svg = await response.text();
  if (!svg.trimStart().startsWith("<svg")) {
    throw new Error(`Invalid SVG returned for ${normalized}`);
  }
  return { name: normalized, svg };
};

export const searchMdiIcons = async (query: string, limit = 48): Promise<MdiSearchResult[]> => {
  const cleanQuery = query.trim().replace(/^mdi:/i, "");
  if (cleanQuery.length < 2) {
    return [];
  }

  const params = new URLSearchParams({ query: cleanQuery, prefix: "mdi", limit: String(limit) });
  const response = await fetch(`${ICONIFY_API}/search?${params}`);
  if (!response.ok) {
    throw new Error("Unable to search Material Design Icons");
  }

  const data = (await response.json()) as IconifySearchResponse;
  return (data.icons ?? [])
    .filter((id) => id.startsWith("mdi:"))
    .map((id) => ({ name: id.slice(4), id, svgUrl: mdiSvgUrl(id) }));
};
