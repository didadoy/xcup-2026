// ISO country codes para banderas (flagcdn.com) — 48 selecciones del Mundial 2026
export const TEAM_META = {
  // Grupo A
  "Mexico":        { code: "mx",     es: "México" },
  "South Africa":  { code: "za",     es: "Sudáfrica" },
  "South Korea":   { code: "kr",     es: "Corea del Sur" },
  "Czech Republic":{ code: "cz",     es: "Chequia" },
  // Grupo B
  "Canada":        { code: "ca",     es: "Canadá" },
  "Bosnia and Herzegovina": { code: "ba", es: "Bosnia" },
  "Qatar":         { code: "qa",     es: "Catar" },
  "Switzerland":   { code: "ch",     es: "Suiza" },
  // Grupo C
  "Brazil":        { code: "br",     es: "Brasil" },
  "Morocco":       { code: "ma",     es: "Marruecos" },
  "Haiti":         { code: "ht",     es: "Haití" },
  "Scotland":      { code: "gb-sct", es: "Escocia" },
  // Grupo D
  "USA":           { code: "us",     es: "EE. UU." },
  "Paraguay":      { code: "py",     es: "Paraguay" },
  "Australia":     { code: "au",     es: "Australia" },
  "Turkey":        { code: "tr",     es: "Turquía" },
  // Grupo E
  "Germany":       { code: "de",     es: "Alemania" },
  "Curaçao":       { code: "cw",     es: "Curazao" },
  "Ivory Coast":   { code: "ci",     es: "C. de Marfil" },
  "Ecuador":       { code: "ec",     es: "Ecuador" },
  // Grupo F
  "Netherlands":   { code: "nl",     es: "P. Bajos" },
  "Japan":         { code: "jp",     es: "Japón" },
  "Sweden":        { code: "se",     es: "Suecia" },
  "Tunisia":       { code: "tn",     es: "Túnez" },
  // Grupo G
  "Belgium":       { code: "be",     es: "Bélgica" },
  "Egypt":         { code: "eg",     es: "Egipto" },
  "Iran":          { code: "ir",     es: "Irán" },
  "New Zealand":   { code: "nz",     es: "N. Zelanda" },
  // Grupo H
  "Spain":         { code: "es",     es: "España" },
  "Cape Verde":    { code: "cv",     es: "Cabo Verde" },
  "Saudi Arabia":  { code: "sa",     es: "Arabia S." },
  "Uruguay":       { code: "uy",     es: "Uruguay" },
  // Grupo I
  "France":        { code: "fr",     es: "Francia" },
  "Senegal":       { code: "sn",     es: "Senegal" },
  "Iraq":          { code: "iq",     es: "Irak" },
  "Norway":        { code: "no",     es: "Noruega" },
  // Grupo J
  "Argentina":     { code: "ar",     es: "Argentina" },
  "Algeria":       { code: "dz",     es: "Argelia" },
  "Austria":       { code: "at",     es: "Austria" },
  "Jordan":        { code: "jo",     es: "Jordania" },
  // Grupo K
  "Portugal":      { code: "pt",     es: "Portugal" },
  "DR Congo":      { code: "cd",     es: "RD Congo" },
  "Uzbekistan":    { code: "uz",     es: "Uzbekistán" },
  "Colombia":      { code: "co",     es: "Colombia" },
  // Grupo L
  "England":       { code: "gb-eng", es: "Inglaterra" },
  "Croatia":       { code: "hr",     es: "Croacia" },
  "Ghana":         { code: "gh",     es: "Ghana" },
  "Panama":        { code: "pa",     es: "Panamá" },
}

export function getFlagUrl(teamName, size = 40) {
  const meta = TEAM_META[teamName]
  if (!meta) return null
  return `https://flagcdn.com/w${size}/${meta.code}.png`
}

export function teamLabel(teamName) {
  return TEAM_META[teamName]?.es ?? teamName ?? 'Por definir'
}
