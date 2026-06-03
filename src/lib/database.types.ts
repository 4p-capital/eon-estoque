export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  estoque: {
    Tables: {
      composicao: {
        Row: {
          id: string
          insumo_id: string
          quantidade: number
          tipo_kit_id: string
        }
        Insert: {
          id?: string
          insumo_id: string
          quantidade: number
          tipo_kit_id: string
        }
        Update: {
          id?: string
          insumo_id?: string
          quantidade?: number
          tipo_kit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "composicao_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "composicao_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "ponto_de_pedido_view"
            referencedColumns: ["insumo_id"]
          },
          {
            foreignKeyName: "composicao_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "saldo_insumo"
            referencedColumns: ["insumo_id"]
          },
          {
            foreignKeyName: "composicao_tipo_kit_id_fkey"
            columns: ["tipo_kit_id"]
            isOneToOne: false
            referencedRelation: "kits_possiveis_view"
            referencedColumns: ["tipo_kit_id"]
          },
          {
            foreignKeyName: "composicao_tipo_kit_id_fkey"
            columns: ["tipo_kit_id"]
            isOneToOne: false
            referencedRelation: "tipo_kit"
            referencedColumns: ["id"]
          },
        ]
      }
      contagem: {
        Row: {
          aplicada_em: string | null
          aplicada_por: string | null
          created_at: string
          criado_por: string | null
          empreendimento_id: string
          id: string
          observacao: string | null
          regiao: string | null
          status: string
        }
        Insert: {
          aplicada_em?: string | null
          aplicada_por?: string | null
          created_at?: string
          criado_por?: string | null
          empreendimento_id: string
          id?: string
          observacao?: string | null
          regiao?: string | null
          status?: string
        }
        Update: {
          aplicada_em?: string | null
          aplicada_por?: string | null
          created_at?: string
          criado_por?: string | null
          empreendimento_id?: string
          id?: string
          observacao?: string | null
          regiao?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contagem_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimento"
            referencedColumns: ["id"]
          },
        ]
      }
      contagem_item: {
        Row: {
          contagem_id: string
          created_at: string
          id: string
          insumo_id: string
          qtd_contada: number
          saldo_sistema: number | null
        }
        Insert: {
          contagem_id: string
          created_at?: string
          id?: string
          insumo_id: string
          qtd_contada: number
          saldo_sistema?: number | null
        }
        Update: {
          contagem_id?: string
          created_at?: string
          id?: string
          insumo_id?: string
          qtd_contada?: number
          saldo_sistema?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contagem_item_contagem_id_fkey"
            columns: ["contagem_id"]
            isOneToOne: false
            referencedRelation: "contagem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contagem_item_contagem_id_fkey"
            columns: ["contagem_id"]
            isOneToOne: false
            referencedRelation: "contagem_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contagem_item_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contagem_item_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "ponto_de_pedido_view"
            referencedColumns: ["insumo_id"]
          },
          {
            foreignKeyName: "contagem_item_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "saldo_insumo"
            referencedColumns: ["insumo_id"]
          },
        ]
      }
      de_para_fornecedor: {
        Row: {
          cnpj_emitente: string | null
          codigo_ean: string | null
          codigo_produto: string | null
          created_at: string
          descricao_fornecedor: string
          fator_conversao: number
          id: string
          insumo_id: string
        }
        Insert: {
          cnpj_emitente?: string | null
          codigo_ean?: string | null
          codigo_produto?: string | null
          created_at?: string
          descricao_fornecedor: string
          fator_conversao?: number
          id?: string
          insumo_id: string
        }
        Update: {
          cnpj_emitente?: string | null
          codigo_ean?: string | null
          codigo_produto?: string | null
          created_at?: string
          descricao_fornecedor?: string
          fator_conversao?: number
          id?: string
          insumo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "de_para_fornecedor_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "de_para_fornecedor_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "ponto_de_pedido_view"
            referencedColumns: ["insumo_id"]
          },
          {
            foreignKeyName: "de_para_fornecedor_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "saldo_insumo"
            referencedColumns: ["insumo_id"]
          },
        ]
      }
      empreendimento: {
        Row: {
          created_at: string
          id: string
          nome: string
          qtd_apartamentos: number
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          qtd_apartamentos?: number
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          qtd_apartamentos?: number
        }
        Relationships: []
      }
      evento: {
        Row: {
          created_at: string
          dados: Json | null
          descricao: string
          empreendimento_id: string | null
          id: string
          nota_id: string | null
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          dados?: Json | null
          descricao: string
          empreendimento_id?: string | null
          id?: string
          nota_id?: string | null
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          dados?: Json | null
          descricao?: string
          empreendimento_id?: string | null
          id?: string
          nota_id?: string | null
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evento_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "nota_fiscal"
            referencedColumns: ["id"]
          },
        ]
      }
      insumo: {
        Row: {
          codigo_sienge: string | null
          consumo_dia: number
          created_at: string
          estoque_min: number
          id: string
          lead_time_dias: number
          nome: string
          unidade: string
        }
        Insert: {
          codigo_sienge?: string | null
          consumo_dia?: number
          created_at?: string
          estoque_min?: number
          id?: string
          lead_time_dias?: number
          nome: string
          unidade: string
        }
        Update: {
          codigo_sienge?: string | null
          consumo_dia?: number
          created_at?: string
          estoque_min?: number
          id?: string
          lead_time_dias?: number
          nome?: string
          unidade?: string
        }
        Relationships: []
      }
      local: {
        Row: {
          cnpj: string | null
          created_at: string
          id: string
          is_padrao: boolean
          nome: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          id?: string
          is_padrao?: boolean
          nome: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          id?: string
          is_padrao?: boolean
          nome?: string
        }
        Relationships: []
      }
      lote: {
        Row: {
          created_at: string
          data_producao: string
          empreendimento_id: string | null
          finalizado_em: string | null
          finalizado_por: string | null
          id: string
          meta: number | null
          quantidade: number | null
          status: string
          tipo_kit_id: string
        }
        Insert: {
          created_at?: string
          data_producao?: string
          empreendimento_id?: string | null
          finalizado_em?: string | null
          finalizado_por?: string | null
          id?: string
          meta?: number | null
          quantidade?: number | null
          status?: string
          tipo_kit_id: string
        }
        Update: {
          created_at?: string
          data_producao?: string
          empreendimento_id?: string | null
          finalizado_em?: string | null
          finalizado_por?: string | null
          id?: string
          meta?: number | null
          quantidade?: number | null
          status?: string
          tipo_kit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lote_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_tipo_kit_id_fkey"
            columns: ["tipo_kit_id"]
            isOneToOne: false
            referencedRelation: "kits_possiveis_view"
            referencedColumns: ["tipo_kit_id"]
          },
          {
            foreignKeyName: "lote_tipo_kit_id_fkey"
            columns: ["tipo_kit_id"]
            isOneToOne: false
            referencedRelation: "tipo_kit"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacao: {
        Row: {
          data: string
          empreendimento_id: string | null
          id: string
          insumo_id: string | null
          local_id: string | null
          lote_id: string | null
          nota_item_id: string | null
          observacao: string | null
          quantidade: number
          tipo: string
          unidade_kit_id: string | null
          usuario_id: string | null
        }
        Insert: {
          data?: string
          empreendimento_id?: string | null
          id?: string
          insumo_id?: string | null
          local_id?: string | null
          lote_id?: string | null
          nota_item_id?: string | null
          observacao?: string | null
          quantidade: number
          tipo: string
          unidade_kit_id?: string | null
          usuario_id?: string | null
        }
        Update: {
          data?: string
          empreendimento_id?: string | null
          id?: string
          insumo_id?: string | null
          local_id?: string | null
          lote_id?: string | null
          nota_item_id?: string | null
          observacao?: string | null
          quantidade?: number
          tipo?: string
          unidade_kit_id?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacao_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacao_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacao_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "ponto_de_pedido_view"
            referencedColumns: ["insumo_id"]
          },
          {
            foreignKeyName: "movimentacao_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "saldo_insumo"
            referencedColumns: ["insumo_id"]
          },
          {
            foreignKeyName: "movimentacao_local_id_fkey"
            columns: ["local_id"]
            isOneToOne: false
            referencedRelation: "local"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacao_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lote"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacao_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lote_resumo_view"
            referencedColumns: ["lote_id"]
          },
          {
            foreignKeyName: "movimentacao_nota_item_id_fkey"
            columns: ["nota_item_id"]
            isOneToOne: false
            referencedRelation: "nota_item"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacao_unidade_kit_id_fkey"
            columns: ["unidade_kit_id"]
            isOneToOne: false
            referencedRelation: "unidade_kit"
            referencedColumns: ["id"]
          },
        ]
      }
      nota_fiscal: {
        Row: {
          chave: string
          created_at: string
          data_emissao: string | null
          emitente_cnpj: string | null
          emitente_nome: string | null
          empreendimento_id: string | null
          id: string
          motivo_recusa: string | null
          numero: string | null
          recebido_em: string | null
          recebido_por: string | null
          serie: string | null
          spe_id: string | null
          status: string
          updated_at: string
          valor_total: number | null
          xml: string | null
        }
        Insert: {
          chave: string
          created_at?: string
          data_emissao?: string | null
          emitente_cnpj?: string | null
          emitente_nome?: string | null
          empreendimento_id?: string | null
          id?: string
          motivo_recusa?: string | null
          numero?: string | null
          recebido_em?: string | null
          recebido_por?: string | null
          serie?: string | null
          spe_id?: string | null
          status?: string
          updated_at?: string
          valor_total?: number | null
          xml?: string | null
        }
        Update: {
          chave?: string
          created_at?: string
          data_emissao?: string | null
          emitente_cnpj?: string | null
          emitente_nome?: string | null
          empreendimento_id?: string | null
          id?: string
          motivo_recusa?: string | null
          numero?: string | null
          recebido_em?: string | null
          recebido_por?: string | null
          serie?: string | null
          spe_id?: string | null
          status?: string
          updated_at?: string
          valor_total?: number | null
          xml?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nota_fiscal_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_fiscal_spe_id_fkey"
            columns: ["spe_id"]
            isOneToOne: false
            referencedRelation: "spe"
            referencedColumns: ["id"]
          },
        ]
      }
      nota_item: {
        Row: {
          cfop: string | null
          codigo_fornecedor: string | null
          created_at: string
          descricao: string | null
          ean: string | null
          fator_conversao: number
          id: string
          insumo_id: string | null
          ncm: string | null
          nota_id: string
          num_item: number
          quantidade: number
          quantidade_recebida: number | null
          unidade: string | null
          valor_total: number | null
          valor_unitario: number | null
        }
        Insert: {
          cfop?: string | null
          codigo_fornecedor?: string | null
          created_at?: string
          descricao?: string | null
          ean?: string | null
          fator_conversao?: number
          id?: string
          insumo_id?: string | null
          ncm?: string | null
          nota_id: string
          num_item: number
          quantidade: number
          quantidade_recebida?: number | null
          unidade?: string | null
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Update: {
          cfop?: string | null
          codigo_fornecedor?: string | null
          created_at?: string
          descricao?: string | null
          ean?: string | null
          fator_conversao?: number
          id?: string
          insumo_id?: string | null
          ncm?: string | null
          nota_id?: string
          num_item?: number
          quantidade?: number
          quantidade_recebida?: number | null
          unidade?: string | null
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nota_item_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_item_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "ponto_de_pedido_view"
            referencedColumns: ["insumo_id"]
          },
          {
            foreignKeyName: "nota_item_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "saldo_insumo"
            referencedColumns: ["insumo_id"]
          },
          {
            foreignKeyName: "nota_item_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "nota_fiscal"
            referencedColumns: ["id"]
          },
        ]
      }
      spe: {
        Row: {
          ativo: boolean
          certificado_cifrado: string
          certificado_validade: string
          cnpj: string
          created_at: string
          empreendimento_id: string | null
          id: string
          razao_social: string
          senha_cifrada: string
          uf: string | null
          ultimo_nsu: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          certificado_cifrado: string
          certificado_validade: string
          cnpj: string
          created_at?: string
          empreendimento_id?: string | null
          id?: string
          razao_social: string
          senha_cifrada: string
          uf?: string | null
          ultimo_nsu?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          certificado_cifrado?: string
          certificado_validade?: string
          cnpj?: string
          created_at?: string
          empreendimento_id?: string | null
          id?: string
          razao_social?: string
          senha_cifrada?: string
          uf?: string | null
          ultimo_nsu?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spe_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimento"
            referencedColumns: ["id"]
          },
        ]
      }
      tipo_kit: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      unidade_kit: {
        Row: {
          created_at: string
          entrada_em: string | null
          entrada_por: string | null
          id: string
          impressa_em: string | null
          local_id: string | null
          lote_id: string
          numero: number
          qr_code: string
          status: string
        }
        Insert: {
          created_at?: string
          entrada_em?: string | null
          entrada_por?: string | null
          id?: string
          impressa_em?: string | null
          local_id?: string | null
          lote_id: string
          numero: number
          qr_code: string
          status?: string
        }
        Update: {
          created_at?: string
          entrada_em?: string | null
          entrada_por?: string | null
          id?: string
          impressa_em?: string | null
          local_id?: string | null
          lote_id?: string
          numero?: number
          qr_code?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "unidade_kit_local_id_fkey"
            columns: ["local_id"]
            isOneToOne: false
            referencedRelation: "local"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unidade_kit_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lote"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unidade_kit_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lote_resumo_view"
            referencedColumns: ["lote_id"]
          },
        ]
      }
    }
    Views: {
      contagem_resumo: {
        Row: {
          aplicada_em: string | null
          created_at: string | null
          diferenca_total: number | null
          empreendimento_id: string | null
          empreendimento_nome: string | null
          id: string | null
          observacao: string | null
          qtd_itens: number | null
          regiao: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contagem_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimento"
            referencedColumns: ["id"]
          },
        ]
      }
      kits_possiveis_view: {
        Row: {
          insumo_gargalo_id: string | null
          insumo_gargalo_nome: string | null
          qtd_possivel: number | null
          tipo_kit_id: string | null
          tipo_kit_nome: string | null
        }
        Relationships: []
      }
      lote_resumo_view: {
        Row: {
          created_at: string | null
          data_producao: string | null
          empreendimento_id: string | null
          empreendimento_nome: string | null
          finalizado_em: string | null
          gap: number | null
          lote_id: string | null
          meta: number | null
          qtd_bipadas: number | null
          qtd_canceladas: number | null
          qtd_impressas: number | null
          qtd_pendentes: number | null
          status: string | null
          tipo_kit_id: string | null
          tipo_kit_nome: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lote_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_tipo_kit_id_fkey"
            columns: ["tipo_kit_id"]
            isOneToOne: false
            referencedRelation: "kits_possiveis_view"
            referencedColumns: ["tipo_kit_id"]
          },
          {
            foreignKeyName: "lote_tipo_kit_id_fkey"
            columns: ["tipo_kit_id"]
            isOneToOne: false
            referencedRelation: "tipo_kit"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_de_pedido_view: {
        Row: {
          consumo_dia: number | null
          estoque_min: number | null
          insumo_id: string | null
          lead_time_dias: number | null
          nome: string | null
          ponto_pedido: number | null
          precisa_comprar: boolean | null
          saldo: number | null
          sugestao_compra: number | null
          unidade: string | null
        }
        Relationships: []
      }
      saldo_insumo: {
        Row: {
          consumo_dia: number | null
          estoque_min: number | null
          insumo_id: string | null
          lead_time_dias: number | null
          nome: string | null
          saldo: number | null
          unidade: string | null
        }
        Relationships: []
      }
      saldo_insumo_empreendimento: {
        Row: {
          empreendimento_id: string | null
          insumo_id: string | null
          nome: string | null
          saldo: number | null
          unidade: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacao_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacao_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacao_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "ponto_de_pedido_view"
            referencedColumns: ["insumo_id"]
          },
          {
            foreignKeyName: "movimentacao_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "saldo_insumo"
            referencedColumns: ["insumo_id"]
          },
        ]
      }
    }
    Functions: {
      abrir_lote: {
        Args: {
          p_empreendimento_id: string
          p_meta?: number
          p_tipo_kit_id: string
        }
        Returns: {
          created_at: string
          data_producao: string
          empreendimento_id: string | null
          finalizado_em: string | null
          finalizado_por: string | null
          id: string
          meta: number | null
          quantidade: number | null
          status: string
          tipo_kit_id: string
        }
        SetofOptions: {
          from: "*"
          to: "lote"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      aplicar_contagem: { Args: { p_contagem_id: string }; Returns: undefined }
      calcular_kits_possiveis:
        | {
            Args: { p_tipo_kit_id: string }
            Returns: {
              insumo_gargalo_id: string
              insumo_gargalo_nome: string
              qtd_possivel: number
            }[]
          }
        | {
            Args: { p_empreendimento_id: string; p_tipo_kit_id: string }
            Returns: {
              insumo_gargalo_id: string
              insumo_gargalo_nome: string
              qtd_possivel: number
            }[]
          }
      cancelar_lote: {
        Args: { p_lote_id: string }
        Returns: {
          created_at: string
          data_producao: string
          empreendimento_id: string | null
          finalizado_em: string | null
          finalizado_por: string | null
          id: string
          meta: number | null
          quantidade: number | null
          status: string
          tipo_kit_id: string
        }
        SetofOptions: {
          from: "*"
          to: "lote"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      consultar_kit_publico: {
        Args: { p_qr_code: string }
        Returns: {
          data_producao: string
          empreendimento_nome: string
          fabricado_em: string
          lote_id: string
          numero: number
          status: string
          tipo_kit_nome: string
        }[]
      }
      criar_kit_com_bom: {
        Args: { p_descricao: string; p_itens: Json; p_nome: string }
        Returns: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
        }
        SetofOptions: {
          from: "*"
          to: "tipo_kit"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      editar_kit_com_bom: {
        Args: {
          p_descricao: string
          p_itens: Json
          p_kit_id: string
          p_nome: string
        }
        Returns: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
        }
        SetofOptions: {
          from: "*"
          to: "tipo_kit"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      finalizar_lote: {
        Args: { p_lote_id: string }
        Returns: {
          created_at: string
          data_producao: string
          empreendimento_id: string | null
          finalizado_em: string | null
          finalizado_por: string | null
          id: string
          meta: number | null
          quantidade: number | null
          status: string
          tipo_kit_id: string
        }
        SetofOptions: {
          from: "*"
          to: "lote"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      gerar_etiquetas: {
        Args: { p_lote_id: string; p_quantidade: number }
        Returns: {
          created_at: string
          entrada_em: string | null
          entrada_por: string | null
          id: string
          impressa_em: string | null
          local_id: string | null
          lote_id: string
          numero: number
          qr_code: string
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "unidade_kit"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      receber_nota: {
        Args: { p_itens: Json; p_local_id?: string; p_nota_id: string }
        Returns: {
          chave: string
          created_at: string
          data_emissao: string | null
          emitente_cnpj: string | null
          emitente_nome: string | null
          empreendimento_id: string | null
          id: string
          motivo_recusa: string | null
          numero: string | null
          recebido_em: string | null
          recebido_por: string | null
          serie: string | null
          spe_id: string | null
          status: string
          updated_at: string
          valor_total: number | null
          xml: string | null
        }
        SetofOptions: {
          from: "*"
          to: "nota_fiscal"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      recusar_nota: {
        Args: { p_motivo: string; p_nota_id: string }
        Returns: {
          chave: string
          created_at: string
          data_emissao: string | null
          emitente_cnpj: string | null
          emitente_nome: string | null
          empreendimento_id: string | null
          id: string
          motivo_recusa: string | null
          numero: string | null
          recebido_em: string | null
          recebido_por: string | null
          serie: string | null
          spe_id: string | null
          status: string
          updated_at: string
          valor_total: number | null
          xml: string | null
        }
        SetofOptions: {
          from: "*"
          to: "nota_fiscal"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      registrar_entrada_kit: {
        Args: { p_local_id?: string; p_qr_code: string }
        Returns: {
          created_at: string
          entrada_em: string | null
          entrada_por: string | null
          id: string
          impressa_em: string | null
          local_id: string | null
          lote_id: string
          numero: number
          qr_code: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "unidade_kit"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      registrar_saida_kit: {
        Args: {
          p_local_destino_id?: string
          p_observacao?: string
          p_qr_code: string
        }
        Returns: {
          created_at: string
          entrada_em: string | null
          entrada_por: string | null
          id: string
          impressa_em: string | null
          local_id: string | null
          lote_id: string
          numero: number
          qr_code: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "unidade_kit"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      configuracoes_notificacao: {
        Row: {
          id: number
          notificar_fornecedor: boolean
          notificar_grupo: boolean
          updated_at: string
        }
        Insert: {
          id?: number
          notificar_fornecedor?: boolean
          notificar_grupo?: boolean
          updated_at?: string
        }
        Update: {
          id?: number
          notificar_fornecedor?: boolean
          notificar_grupo?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      eventos_pedidos_aprovados: {
        Row: {
          centro_custo: string | null
          contato_fornecedor: string | null
          created_at: string
          fornecedor_notificado: boolean | null
          grupo_notificado: boolean
          id: string
          id_fornecedor: string | null
          id_pedido: string | null
          nome_contato: string | null
          nome_fornecedor: string | null
          notificacao_motivo: string | null
          notificacao_status: string
          storage_pdf_pedido: string | null
        }
        Insert: {
          centro_custo?: string | null
          contato_fornecedor?: string | null
          created_at?: string
          fornecedor_notificado?: boolean | null
          grupo_notificado?: boolean
          id?: string
          id_fornecedor?: string | null
          id_pedido?: string | null
          nome_contato?: string | null
          nome_fornecedor?: string | null
          notificacao_motivo?: string | null
          notificacao_status?: string
          storage_pdf_pedido?: string | null
        }
        Update: {
          centro_custo?: string | null
          contato_fornecedor?: string | null
          created_at?: string
          fornecedor_notificado?: boolean | null
          grupo_notificado?: boolean
          id?: string
          id_fornecedor?: string | null
          id_pedido?: string | null
          nome_contato?: string | null
          nome_fornecedor?: string | null
          notificacao_motivo?: string | null
          notificacao_status?: string
          storage_pdf_pedido?: string | null
        }
        Relationships: []
      }
      grupos_notificacao: {
        Row: {
          ativo: boolean
          centros_custo: string[]
          contato: string
          created_at: string
          id: string
          nome_grupo: string
        }
        Insert: {
          ativo?: boolean
          centros_custo?: string[]
          contato: string
          created_at?: string
          id?: string
          nome_grupo: string
        }
        Update: {
          ativo?: boolean
          centros_custo?: string[]
          contato?: string
          created_at?: string
          id?: string
          nome_grupo?: string
        }
        Relationships: []
      }
      logs_eventos_de_solicitacao_sienge: {
        Row: {
          created_at: string
          id: number
          id_solicitacao: number
          ultimo_evento_em: string | null
          ultimo_item_recebido: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          id_solicitacao: number
          ultimo_evento_em?: string | null
          ultimo_item_recebido?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          id_solicitacao?: number
          ultimo_evento_em?: string | null
          ultimo_item_recebido?: number | null
        }
        Relationships: []
      }
      logs_pedidos_aprovados: {
        Row: {
          created_at: string
          id: number
          id_empreendimento: number | null
          id_pedido: string | null
          link_drive: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          id_empreendimento?: number | null
          id_pedido?: string | null
          link_drive?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          id_empreendimento?: number | null
          id_pedido?: string | null
          link_drive?: string | null
        }
        Relationships: []
      }
      notificacao_queue: {
        Row: {
          agendada_para: string
          created_at: string
          destinatario: string
          evento_pedido_id: string
          id: string
          mensagem: string
          nome_destinatario: string | null
          processada_em: string | null
          status: string
          tentativas: number
          tipo_destinatario: string
          tracking_token: string
          ultimo_erro: string | null
        }
        Insert: {
          agendada_para?: string
          created_at?: string
          destinatario: string
          evento_pedido_id: string
          id?: string
          mensagem: string
          nome_destinatario?: string | null
          processada_em?: string | null
          status?: string
          tentativas?: number
          tipo_destinatario: string
          tracking_token: string
          ultimo_erro?: string | null
        }
        Update: {
          agendada_para?: string
          created_at?: string
          destinatario?: string
          evento_pedido_id?: string
          id?: string
          mensagem?: string
          nome_destinatario?: string | null
          processada_em?: string | null
          status?: string
          tentativas?: number
          tipo_destinatario?: string
          tracking_token?: string
          ultimo_erro?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notificacao_queue_evento_pedido_id_fkey"
            columns: ["evento_pedido_id"]
            isOneToOne: false
            referencedRelation: "eventos_pedidos_aprovados"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_message_status: {
        Row: {
          button_clicked: boolean
          button_clicked_at: string | null
          click_count: number
          created_at: string
          destinatario: string
          evento_pedido_id: string | null
          first_clicked_at: string | null
          id: string
          last_click_ip: string | null
          last_click_user_agent: string | null
          last_clicked_at: string | null
          message_id: string
          nome_destinatario: string | null
          payload_raw: Json | null
          status: string
          status_timestamp: string
          tipo_destinatario: string
          tracking_token: string | null
          updated_at: string
          zaap_id: string | null
        }
        Insert: {
          button_clicked?: boolean
          button_clicked_at?: string | null
          click_count?: number
          created_at?: string
          destinatario: string
          evento_pedido_id?: string | null
          first_clicked_at?: string | null
          id?: string
          last_click_ip?: string | null
          last_click_user_agent?: string | null
          last_clicked_at?: string | null
          message_id: string
          nome_destinatario?: string | null
          payload_raw?: Json | null
          status?: string
          status_timestamp?: string
          tipo_destinatario: string
          tracking_token?: string | null
          updated_at?: string
          zaap_id?: string | null
        }
        Update: {
          button_clicked?: boolean
          button_clicked_at?: string | null
          click_count?: number
          created_at?: string
          destinatario?: string
          evento_pedido_id?: string | null
          first_clicked_at?: string | null
          id?: string
          last_click_ip?: string | null
          last_click_user_agent?: string | null
          last_clicked_at?: string | null
          message_id?: string
          nome_destinatario?: string | null
          payload_raw?: Json | null
          status?: string
          status_timestamp?: string
          tipo_destinatario?: string
          tracking_token?: string | null
          updated_at?: string
          zaap_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_status_evento_pedido_id_fkey"
            columns: ["evento_pedido_id"]
            isOneToOne: false
            referencedRelation: "eventos_pedidos_aprovados"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  estoque: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
