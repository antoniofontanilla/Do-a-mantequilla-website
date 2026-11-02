// src/types/ia.ts

export type TipoSugerenciaIA =
  | "REORDENAR_VISITAS"
  | "TIEMPOS_MUERTOS"
  | "AGRUPAR_CLIENTES"
  | "CAMBIAR_OPERARIO"
  | "SOBRECARGA";

export type ImpactoNivel = "ALTO" | "MEDIO" | "BAJO";

export interface SugerenciaIA {
  id: string;
  tipo: TipoSugerenciaIA;
  titulo: string;
  descripcion: string;
  impacto: ImpactoNivel;
  ahorroEstimado?: string; // ej: "35 min de traslado", "12 km recorridos"
  citasInvolucradas: string[]; // IDs de las citas afectadas
  operarioId?: string;
  operarioSugeridoId?: string;
  aplicada?: boolean;
}
