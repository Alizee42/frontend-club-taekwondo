// Utilitaires partagés pour la gestion des documents (catalogue, mapping, helpers)

export type StatutDoc = 'validé' | 'refusé' | 'en_attente' | string;

export interface DocumentItem {
  id: number | string;
  typeDocument: string;
  nomDocument?: string;
  status: StatutDoc;
  dateDepot?: string;
}

export interface RequiredDoc {
  type: string;  // code catalogue
  label: string; // libellé humain
  uploaded: boolean;
  etat: 'validé' | 'en_attente' | 'refusé' | 'non_envoyé';
}

export const DOC_CATALOG: Array<{ code: string; label: string; aliases?: string[] }> = [
  { code: 'CERTIFICAT_MEDICAL', label: 'Certificat médical (< 1 an)', aliases: ['CERTIF_MEDICAL','CERTIFICAT','MEDICAL'] },
  { code: 'PHOTO_IDENTITE',     label: "Photo d'identité",            aliases: ["PHOTO D'IDENTITE", 'PHOTO_IDENTITÉ', 'PHOTO', 'PHOTOGRAPHIE', "PHOTO D'IDENTITÉ"] },
  { code: 'DOCUMENT_IDENTITE',  label: "Document d'identité",         aliases: ['PIECE_IDENTITE', "PIÈCE D'IDENTITÉ", 'CARTE_IDENTITE', "CARTE D'IDENTITÉ", 'CNI', 'PASSEPORT', 'JUSTIFICATIF_IDENTITE', 'JUSTIFICATIF IDENTITE'] }
];

export const LABEL_BY_CODE: Record<string, string> = DOC_CATALOG.reduce((acc, t) => {
  acc[t.code] = t.label; return acc;
}, {} as Record<string, string>);

export function labelFor(code: string): string {
  return LABEL_BY_CODE[code] || code;
}

export function normalizeStatus(s: any): 'validé' | 'refusé' | 'en_attente' {
  const v = String(s || '').toLowerCase();
  if (['valide','validé','validee','validée','approved'].includes(v)) return 'validé';
  if (['pending','en_attente','en attente','attente'].includes(v))    return 'en_attente';
  if (['refuse','refusé','refusee','refusée','rejected'].includes(v)) return 'refusé';
  return 'en_attente';
}

export function unifyType(input: any): string {
  const raw = String(input || '').trim();
  if (!raw) return raw;
  if (DOC_CATALOG.some(t => t.code === raw)) return raw;
  const norm = raw
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[\s'’_-]+/g, '');
  for (const t of DOC_CATALOG) {
    const candidates = [t.code, t.label, ...(t.aliases || [])];
    if (candidates.some(c => String(c)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[\s'’_-]+/g, '') === norm)) {
      return t.code;
    }
  }
  return raw;
}

export function computeRequiredDocsState(required: RequiredDoc[], docs: DocumentItem[]): RequiredDoc[] {
  return required.map(req => {
    const code = req.type;
    const docsOfType = docs.filter(d => unifyType(d.typeDocument) === code);
    if (docsOfType.length === 0) return { ...req, uploaded: false, etat: 'non_envoyé' };
    if (docsOfType.some(d => normalizeStatus(d.status) === 'validé')) return { ...req, uploaded: true, etat: 'validé' };
    if (docsOfType.some(d => normalizeStatus(d.status) === 'refusé')) return { ...req, uploaded: false, etat: 'refusé' };
    return { ...req, uploaded: true, etat: 'en_attente' };
  });
}

export function countMissingRequired(required: RequiredDoc[]): number {
  return required.filter(d => d.etat === 'non_envoyé' || d.etat === 'refusé').length;
}
