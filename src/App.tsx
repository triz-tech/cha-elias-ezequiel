import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import {
  ArrowRight,
  Baby,
  CheckCircle2,
  Gift,
  Heart,
  Instagram,
  LockKeyhole,
  LogOut,
  MessageCircle,
  Settings,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
  XCircle,
} from "lucide-react";

import {
  isSupabaseConfigured,
  RaffleSettings,
  Reservation,
  supabase,
} from "./lib/supabase";

const fallbackSettings: RaffleSettings = {
  id: true,
  title: "Rifa do Elias & Ezequiel",
  price: 15,
  quantity: 50,
  prize_1: 700,
  prize_2: 300,
  prize_3: 100,
  updated_at: "",
  prize_percent: 20,
  display_prize: 150,
  draw_date: "2026-10-01",
  instagram_1: "@wandersonpz",
  instagram_2: "@duda_gentill",
  pix_key: "",
  pix_name: "ELIAS EZEQUIEL",
  pix_city: "RIO DE JANEIRO",
  intro:
    "Uma rifa feita com carinho para ajudar na chegada dos nossos gêmeos.",
};

const WHATSAPP_PAIS = "5521992532358";

type ConsultResult = {
  reservation_code: string;
  status: "pending" | "paid" | "cancelled";
  ticket_numbers: number[];
  total_amount: number;
  created_at: string;
};

type DrawResult = {
  id: string;
  prize_position: number;
  prize_amount: number;
  ticket_number: number;
  reservation_id: string;
  buyer_name: string;
  buyer_phone: string | null;
  drawn_at: string;
};

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dateBR(value: string) {
  if (!value) return "";

  const [year, month, day] = value.split("-");

  return `${day}/${month}/${year}`;
}

function cleanInstagram(value: string) {
  return value.replace(/^@/, "");
}

export default function App() {
  const [admin, setAdmin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  const [settings, setSettings] =
    useState<RaffleSettings>(fallbackSettings);

  const [toast, setToast] = useState("");

  const [countdown, setCountdown] = useState("");

  const [consultCode, setConsultCode] = useState("");
  const [consultResults, setConsultResults] =
    useState<ConsultResult[]>([]);

  const [consultLoading, setConsultLoading] = useState(false);
  const [consultError, setConsultError] = useState("");

  /*
   * Resultados públicos do sorteio.
   */
  const [drawResults, setDrawResults] = useState<DrawResult[]>([]);

  /*
   * Contagem regressiva.
   */
  useEffect(() => {
    function updateCountdown() {
      const draw = new Date(`${settings.draw_date}T23:59:59`);
      const now = new Date();
      const diff = draw.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown("Sorteio realizado");
        return;
      }

      const days = Math.floor(
        diff / (1000 * 60 * 60 * 24)
      );

      const hours = Math.floor(
        (diff / (1000 * 60 * 60)) % 24
      );

      const minutes = Math.floor(
        (diff / (1000 * 60)) % 60
      );

      setCountdown(`${days}d ${hours}h ${minutes}m`);
    }

    updateCountdown();

    const timer = setInterval(updateCountdown, 60000);

    return () => clearInterval(timer);
  }, [settings.draw_date]);

  /*
   * Carrega as configurações públicas.
   */
  async function loadPublic() {
    const client = supabase;

    if (!client) {
      console.error("Supabase não configurado.");
      return;
    }

    const { data, error } = await client
      .from("raffle_settings")
      .select("*")
      .eq("id", true)
      .single();

    if (error) {
      console.error(
        "ERRO SUPABASE:",
        JSON.stringify(error, null, 2)
      );
      return;
    }

    if (data) {
      setSettings(data as RaffleSettings);
    }
  }

  /*
   * Carrega os resultados públicos do sorteio.
   *
   * IMPORTANTE:
   * A página pública usa a função get_draw_results.
   * Ela deve retornar os resultados do sorteio.
   */
async function loadPublicDrawResults() {
  const client = supabase;

  if (!client) return;

  const { data, error } = await client.rpc(
    "get_public_draw_results"
  );

  if (error) {
    console.error(
      "Erro ao carregar ganhadores:",
      error
    );
    return;
  }

  setDrawResults((data ?? []) as DrawResult[]);
}

  /*
   * Consulta de reserva.
   */
  async function consultReservation() {
    const client = supabase;

    if (!client) {
      setConsultError(
        "A consulta está temporariamente indisponível."
      );
      return;
    }

    const code = consultCode.trim();

    if (!code) {
      setConsultError(
        "Digite seu telefone ou o código da reserva."
      );
      return;
    }

    setConsultLoading(true);
    setConsultError("");
    setConsultResults([]);

    const { data, error } = await client.rpc(
      "find_reservation",
      {
        p_search: code,
      }
    );

    setConsultLoading(false);

    if (error) {
      console.error(error);
      setConsultError(
        "Não foi possível consultar a reserva."
      );
      return;
    }

    if (!data || data.length === 0) {
      setConsultError("Reserva não encontrada.");
      return;
    }

    setConsultResults(data as ConsultResult[]);
  }

  /*
   * Inicialização pública.
   */
  useEffect(() => {
    void loadPublic();
    void loadPublicDrawResults();

    const client = supabase;

    if (!client) return;

    void client.auth
      .getSession()
      .then(({ data }) => {
        setAdmin(Boolean(data.session));
      });

    const { data: listener } =
      client.auth.onAuthStateChange(
        (_event, session) => {
          setAdmin(Boolean(session));
        }
      );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  /*
   * Atualização em tempo real.
   */
  useEffect(() => {
    const client = supabase;

    if (!client) return;

    const channel = client
      .channel("raffle-live")

.on(
  "postgres_changes",
  {
    event: "*",
    schema: "public",
    table: "draw_results",
  },
  () => {
    void loadPublicDrawResults();
  }
)

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "draw_results",
        },
        () => {
          /*
           * CORREÇÃO:
           * Antes estava loadDrawResults(),
           * mas essa função não existe no App.
           */
          void loadPublicDrawResults();
        }
      )

      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, []);

  if (showAdmin) {
    return (
      <AdminPage
        settings={settings}
        admin={admin}
        onClose={async () => {
          await loadPublic();
          await loadPublicDrawResults();
          setShowAdmin(false);
        }}
        onRefresh={loadPublic}
        onSettingsChange={setSettings}
        setToast={setToast}
      />
    );
  }

  const winner1 = drawResults.find(
    (item) => item.prize_position === 1
  );

  const winner2 = drawResults.find(
    (item) => item.prize_position === 2
  );

  const winner3 = drawResults.find(
    (item) => item.prize_position === 3
  );

  const hasWinners = drawResults.length > 0;

  return (
    <div className="app">
      {toast && (
        <div className="toast">
          {toast}
        </div>
      )}

      {!isSupabaseConfigured && (
        <div className="demo-banner">
          Modo demonstração: conecte o Supabase.
        </div>
      )}

      <header className="topbar">
        <div className="brand">
          <Baby size={22} />

          <span>
            Elias <b>&</b> Ezequiel
          </span>
        </div>

        <button
          className="admin-link"
          onClick={() => setShowAdmin(true)}
        >
          <LockKeyhole size={16} />
          Área dos pais
        </button>
      </header>

      <main>
        {/* HERO */}

        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <Sparkles size={15} />
              Chá de bebê dos gêmeos
            </span>

            <h1>
              Uma cota, um carinho,
              <br />
              <em>dois sonhos.</em>
            </h1>

            <p>{settings.intro}</p>

            <div className="hero-draw-date">
              <span>Sorteio</span>

              <div className="draw-date-row">
                <strong>
                  {dateBR(settings.draw_date)}
                </strong>

                <span className="draw-countdown">
                  🕐 {countdown}
                </span>
              </div>
            </div>

            <div className="trust">
              <ShieldCheck size={18} />
              Obrigado a todos que participaram 💚
            </div>
          </div>

          <div className="hero-image">
            <img
              src="/capa.png"
              alt="Casal esperando os gêmeos Elias e Ezequiel"
            />

            <div className="image-badge">
              <Heart
                fill="currentColor"
                size={16}
              />
              Feito com amor
            </div>
          </div>
        </section>

        {/* PRÊMIOS */}

        <section className="prizes-public">
          <span className="eyebrow">
            Resultado
          </span>

          <h2>
            Prêmios do sorteio
          </h2>

          <div className="prize-list">
            <div className="prize first">
              <span>1º lugar</span>

              <strong>
                {money(Number(settings.prize_1))}
              </strong>
            </div>

            <div className="prize">
              <span>2º lugar</span>

              <strong>
                {money(Number(settings.prize_2))}
              </strong>
            </div>

            <div className="prize">
              <span>3º lugar</span>

              <strong>
                {money(Number(settings.prize_3))}
              </strong>
            </div>
          </div>
        </section>

        {/* GANHADORES */}

<section className="public-winners">
  <div className="section-head">
    <div>
      <span className="eyebrow">
        Sorteio realizado
      </span>

      <h2>
        Cotas sorteadas
      </h2>
    </div>
  </div>

  {!hasWinners ? (
    <div className="public-winners-empty">
      <Gift size={28} />

      <strong>
        O resultado ainda não foi publicado.
      </strong>

      <span>
        Assim que os pais realizarem o sorteio,
        as cotas sorteadas aparecerão aqui.
      </span>
    </div>
  ) : (
    <div className="public-winner-list">
      {[1, 2, 3].map((position) => {
        const result =
          position === 1
            ? winner1
            : position === 2
            ? winner2
            : winner3;

        const prize =
          position === 1
            ? settings.prize_1
            : position === 2
            ? settings.prize_2
            : settings.prize_3;

        return (
          <div
            className={`public-winner ${
              position === 1
                ? "public-winner-first"
                : ""
            }`}
            key={position}
          >
            <div className="public-winner-top">
              <span>
                {position}º lugar
              </span>

              <strong>
                {money(Number(prize))}
              </strong>
            </div>

{result ? (
  <>
    <div className="public-winner-number">
      <span>
        Cota sorteada
      </span>

      <strong>
        {String(
          result.ticket_number
        ).padStart(2, "0")}
      </strong>
    </div>

    <small>
      Sorteado em{" "}
      {new Date(
        result.drawn_at
      ).toLocaleString("pt-BR")}
    </small>
  </>
) : (
  <div className="public-winner-pending">
    <span>
      Resultado ainda não publicado
    </span>
  </div>
)}
          </div>
        );
      })}
    </div>
  )}
</section>


        {/* CONSULTA */}

        <section className="consult-card">
          <div className="consult-header">
            <span className="eyebrow">
              Já participou?
            </span>

            <h2>
              Consulte sua reserva
            </h2>

            <p>
              Digite seu telefone ou o código da
              reserva para consultar suas cotas e a
              confirmação do pagamento.
            </p>
          </div>

          <div className="consult-form">
            <input
              type="text"
              value={consultCode}
              onChange={(event) =>
                setConsultCode(event.target.value)
              }
              placeholder="Telefone ou código da reserva"
            />

            <button
              type="button"
              onClick={consultReservation}
              disabled={consultLoading}
            >
              {consultLoading
                ? "Consultando..."
                : "Consultar reserva"}
            </button>
          </div>

          {consultError && (
            <div className="consult-error">
              {consultError}
            </div>
          )}

          {consultResults.length > 0 && (
            <div className="consult-results-list">
              {consultResults.length > 1 && (
                <div className="consult-found">
                  Encontramos{" "}
                  {consultResults.length} reservas
                  com este telefone.
                </div>
              )}

              {consultResults.map((result) => (
                <div
                  className="consult-result"
                  key={result.reservation_code}
                >
                  <div className="consult-status">
                    <div>
                      <span>Reserva</span>

                      <strong>
                        {result.reservation_code}
                      </strong>
                    </div>

                    <strong
                      className={`status-${result.status}`}
                    >
                      {result.status === "paid"
                        ? "Pagamento confirmado ✓"
                        : result.status === "pending"
                        ? "Aguardando confirmação"
                        : "Reserva cancelada"}
                    </strong>
                  </div>

                  <div className="consult-tickets">
                    <span>
                      Suas cotas
                    </span>

                    <div className="reserved-numbers">
                      {result.ticket_numbers.map(
                        (number) => (
                          <b key={number}>
                            {String(
                              number
                            ).padStart(2, "0")}
                          </b>
                        )
                      )}
                    </div>
                  </div>

                  <div className="amount">
                    <span>Valor</span>

                    <strong>
                      {money(
                        Number(
                          result.total_amount
                        )
                      )}
                    </strong>
                  </div>

                  {result.status === "pending" && (
                    <p>
                      Seu pagamento ainda está
                      aguardando confirmação dos
                      pais.
                    </p>
                  )}

                  {result.status === "paid" && (
                    <p className="consult-success">
                      Pagamento confirmado.
                      Obrigado por participar! 💚
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* INSTAGRAM */}

        <section className="instagram-card">
          <div>
            <Instagram size={26} />

            <div>
              <span>
                Acompanhe os pais
              </span>

              <strong>
                {settings.instagram_2}
              </strong>
            </div>
          </div>

          <a
            href={`https://instagram.com/${cleanInstagram(
              settings.instagram_2
            )}`}
            target="_blank"
            rel="noreferrer"
          >
            Instagram
            <ArrowRight size={17} />
          </a>
        </section>

        {/* WHATSAPP */}

        <section className="whatsapp-card">
          <div className="whatsapp-card-info">
            <div className="whatsapp-icon">
              <MessageCircle size={24} />
            </div>

            <div>
              <span>
                Ficou com alguma dúvida?
              </span>

              <strong>
                Fale diretamente com os pais
              </strong>
            </div>
          </div>

          <a
            href={`https://wa.me/${WHATSAPP_PAIS}?text=${encodeURIComponent(
              "Oi! Vim pela rifa do Elias e Ezequiel 💚"
            )}`}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
            <ArrowRight size={17} />
          </a>
        </section>
      </main>

      <footer>
        <span>
          Feito com 💚 para a chegada de Elias &
          Ezequiel
        </span>

        <button
          onClick={() => setShowAdmin(true)}
        >
          Área administrativa
        </button>
      </footer>
    </div>
  );
}

function AdminPage({
  settings,
  admin,
  onClose,
  onRefresh,
  onSettingsChange,
  setToast,
}: {
  settings: RaffleSettings;
  admin: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onSettingsChange: (
    settings: RaffleSettings
  ) => void;
  setToast: (message: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [reservations, setReservations] =
    useState<Reservation[]>([]);

  const [draft, setDraft] =
    useState(settings);

  const [loading, setLoading] =
    useState(false);

  /*
   * Este drawResults é DO PAINEL DOS PAIS.
   * Ele pode continuar separado do drawResults
   * público que existe no App.
   */
  const [drawResults, setDrawResults] =
    useState<DrawResult[]>([]);

  const [drawingPrize, setDrawingPrize] =
    useState<number | null>(null);

  const [statusFilter, setStatusFilter] =
    useState<
      "all" | "pending" | "paid" | "cancelled"
    >("all");

  async function loadReservations() {
    const client = supabase;

    if (!admin || !client) return;

    const { data, error } = await client
      .from("reservations")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Erro ao carregar reservas:",
        error
      );

      setToast(
        `Erro ao carregar reservas: ${error.message}`
      );

      return;
    }

    setReservations(
      (data ?? []) as Reservation[]
    );
  }

  async function loadSettings() {
    const client = supabase;

    if (!client) return;

    const { data, error } = await client
      .from("raffle_settings")
      .select("*")
      .eq("id", true)
      .single();

    if (error) {
      console.error(
        "Erro ao carregar configurações:",
        error
      );

      return;
    }

    if (data) {
      const currentSettings =
        data as RaffleSettings;

      setDraft(currentSettings);
      onSettingsChange(currentSettings);
    }
  }

  async function loadDrawResults() {
    const client = supabase;

    if (!client || !admin) return;

    const { data, error } =
      await client.rpc("get_draw_results");

    if (error) {
      console.error(
        "Erro ao carregar sorteio:",
        error
      );

      return;
    }

    setDrawResults(
      (data ?? []) as DrawResult[]
    );
  }

  async function drawPrize(
    position: number
  ) {
    const client = supabase;

    if (!client) return;

    const confirmed =
      window.confirm(
        `Tem certeza que deseja realizar o sorteio do ${position}º prêmio?\n\nO resultado ficará registrado no sistema.`
      );

    if (!confirmed) return;

    setDrawingPrize(position);

    const { data, error } =
      await client.rpc(
        "draw_prize",
        {
          p_prize_position: position,
        }
      );

    setDrawingPrize(null);

    if (error) {
      console.error(
        "Erro ao realizar sorteio:",
        error
      );

      setToast(error.message);

      return;
    }

    if (data) {
      const result =
        data as DrawResult;

      setDrawResults((current) => {
        const withoutCurrentPrize =
          current.filter(
            (item) =>
              item.prize_position !==
              position
          );

        return [
          ...withoutCurrentPrize,
          result,
        ].sort(
          (a, b) =>
            a.prize_position -
            b.prize_position
        );
      });
    }

    setToast(
      `${position}º prêmio sorteado!`
    );
  }

  async function refreshAdmin() {
    await Promise.all([
      loadReservations(),
      onRefresh(),
      loadDrawResults(),
    ]);
  }

  function exportPaidXlsx() {
    const paidOnly =
      reservations.filter(
        (reservation) =>
          reservation.status === "paid"
      );

    if (paidOnly.length === 0) {
      setToast(
        "Ainda não há pagamentos confirmados para exportar."
      );

      return;
    }

    type ReservationExport =
      Reservation & {
        buyer_phone?:
          | string
          | null;
        created_at?: string;
      };

    const rows = paidOnly.map(
      (reservation) => {
        const exportReservation =
          reservation as ReservationExport;

        return {
          Nome:
            reservation.buyer_name,

          Telefone:
            exportReservation.buyer_phone ??
            "",

          Relação:
            reservation.relationship,

          Cotas:
            reservation.ticket_numbers.join(
              ", "
            ),

          Quantidade:
            Number(
              reservation.quantity
            ),

          Valor:
            Number(
              reservation.total_amount
            ),

          Status: "Pago",

          Mensagem:
            reservation.message ?? "",

          Data:
            exportReservation.created_at
              ? new Date(
                  exportReservation.created_at
                ).toLocaleString(
                  "pt-BR"
                )
              : "",
        };
      }
    );

    const worksheet =
      XLSX.utils.json_to_sheet(rows);

    worksheet["!cols"] = [
      { wch: 28 },
      { wch: 18 },
      { wch: 20 },
      { wch: 22 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 45 },
      { wch: 22 },
    ];

    const range =
      XLSX.utils.decode_range(
        worksheet["!ref"] ||
          "A1:I1"
      );

    for (
      let row = 1;
      row <= range.e.r;
      row += 1
    ) {
      const cell =
        worksheet[
          XLSX.utils.encode_cell({
            r: row,
            c: 5,
          })
        ];

      if (cell) {
        cell.t = "n";
        cell.z =
          "R$ #,##0.00";
      }
    }

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Pagamentos confirmados"
    );

    const fileName =
      `rifa-pagos-${new Date()
        .toLocaleDateString("pt-BR")
        .replace(/\//g, "-")}.xlsx`;

    XLSX.writeFile(
      workbook,
      fileName
    );
  }

  async function login(
    event: React.FormEvent
  ) {
    event.preventDefault();

    const client = supabase;

    if (!client) {
      setToast(
        "Configure o Supabase no .env.local antes de entrar no painel."
      );

      return;
    }

    setLoading(true);

    const { error } =
      await client.auth.signInWithPassword(
        {
          email,
          password,
        }
      );

    setLoading(false);

    if (error) {
      setToast("Login inválido.");
    }
  }

  async function logout() {
    const client = supabase;

    if (client) {
      await client.auth.signOut();
    }

    setToast(
      "Sessão encerrada."
    );
  }

  async function updateReservation(
    id: string,
    status:
      | "paid"
      | "cancelled"
  ) {
    const client = supabase;

    if (!client) {
      setToast(
        "Configure o Supabase primeiro."
      );

      return;
    }

    const { error } =
      await client.rpc(
        "set_reservation_status",
        {
          p_reservation_id: id,
          p_status: status,
        }
      );

    if (error) {
      setToast(error.message);
      return;
    }

    setToast(
      status === "paid"
        ? "Pagamento confirmado!"
        : "Reserva liberada."
    );

    await refreshAdmin();
  }

  async function saveSettings(
    event: React.FormEvent
  ) {
    event.preventDefault();

    const client = supabase;

    if (!client) {
      setToast(
        "Configure o Supabase primeiro."
      );

      return;
    }

    setLoading(true);

    const { error } =
      await client.rpc(
        "admin_update_settings",
        {
          p_price:
            Number(draft.price),

          p_quantity:
            Number(draft.quantity),

          p_prize_1:
            Number(draft.prize_1),

          p_prize_2:
            Number(draft.prize_2),

          p_prize_3:
            Number(draft.prize_3),

          p_draw_date:
            draft.draw_date,
        }
      );

    if (error) {
      setLoading(false);
      setToast(error.message);
      return;
    }

    const {
      data,
      error: reloadError,
    } = await client
      .from("raffle_settings")
      .select("*")
      .eq("id", true)
      .single();

    setLoading(false);

    if (reloadError) {
      console.error(
        reloadError
      );

      setToast(
        "Salvou, mas houve erro ao atualizar a tela."
      );

      return;
    }

    if (data) {
      const updatedSettings =
        data as RaffleSettings;

      setDraft(updatedSettings);

      onSettingsChange(
        updatedSettings
      );
    }

    await onRefresh();

    setToast(
      "Configurações salvas!"
    );
  }

  useEffect(() => {
    if (!admin) return;

    void loadSettings();
    void loadReservations();
    void loadDrawResults();
  }, [admin]);

  if (!admin) {
    return (
      <div className="admin-screen">
        <button
          className="back"
          onClick={onClose}
        >
          ← Voltar
        </button>

        <form
          className="login-card"
          onSubmit={login}
        >
          <div className="brand">
            <Baby />

            Elias <b>&</b> Ezequiel
          </div>

          <h1>
            Área dos pais
          </h1>

          <p>
            Entre com o e-mail e a senha
            cadastrados no Supabase.
          </p>

          <label>
            E-mail

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              required
            />
          </label>

          <label>
            Senha

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              required
            />
          </label>

          <button
            className="btn primary full"
            disabled={loading}
          >
            {loading
              ? "Entrando..."
              : "Entrar"}

            <LockKeyhole
              size={17}
            />
          </button>
        </form>
      </div>
    );
  }

  const paidReservations =
    reservations.filter(
      (reservation) =>
        reservation.status ===
        "paid"
    );

  const pendingReservations =
    reservations.filter(
      (reservation) =>
        reservation.status ===
        "pending"
    );

  const filteredReservations =
    reservations.filter(
      (reservation) => {
        if (
          statusFilter ===
          "all"
        ) {
          return true;
        }

        return (
          reservation.status ===
          statusFilter
        );
      }
    );

  const paidAmount =
    paidReservations.reduce(
      (total, reservation) =>
        total +
        Number(
          reservation.total_amount
        ),
      0
    );

  const paidTickets =
    paidReservations.reduce(
      (total, reservation) =>
        total +
        Number(
          reservation.quantity
        ),
      0
    );

  const today = new Date();

  const drawDate = new Date(
    `${settings.draw_date}T00:00:00`
  );

  const drawUnlocked =
    today >= drawDate;

  return (
    <div className="admin-screen">
      <div className="admin-top">
        <div className="brand">
          <Baby />

          Elias <b>&</b> Ezequiel
        </div>

        <div>
          <button
            type="button"
            className="btn ghost"
            onClick={
              exportPaidXlsx
            }
          >
            <Users size={16} />
            Exportar
          </button>

          <button
            className="btn ghost"
            onClick={logout}
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </div>

      <div className="admin-wrap">
        <div className="admin-title">
          <div>
            <span className="eyebrow">
              Dashboard
            </span>

            <h1>
              Controle da rifa
            </h1>
          </div>

          <div className="admin-stats">
            <div>
              <Users />

              <b>
                {
                  paidReservations.length
                }
              </b>

              <span>
                pagas
              </span>
            </div>

            <div>
              <CheckCircle2 />

              <b>
                {money(
                  paidAmount
                )}
              </b>

              <span>
                confirmado
              </span>
            </div>

            <div>
              <Ticket />

              <b>
                {paidTickets} de{" "}
                {settings.quantity}
              </b>

              <span>
                cotas vendidas
              </span>
            </div>

            <div>
              <Ticket />

              <b>
                {
                  pendingReservations.length
                }
              </b>

              <span>
                pendentes
              </span>
            </div>
          </div>
        </div>

        {/* CONFIGURAÇÕES */}

        <section className="admin-card">
          <div className="card-head">
            <div>
              <Settings
                size={20}
              />

              <h2>
                Configurações
              </h2>
            </div>

            <span>
              Edite sem mexer no código
            </span>
          </div>

          <form
            className="settings-form"
            onSubmit={
              saveSettings
            }
          >
            <label>
              Valor da cota

              <input
                type="number"
                min="1"
                step="0.01"
                value={draft.price}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    price: Number(
                      event.target
                        .value
                    ),
                  })
                }
              />
            </label>

            <label>
              Quantidade total de cotas

              <input
                type="number"
                min="1"
                value={
                  draft.quantity
                }
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    quantity:
                      Number(
                        event.target
                          .value
                      ),
                  })
                }
              />
            </label>

            <label>
              1º lugar

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  draft.prize_1
                }
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    prize_1:
                      Number(
                        event.target
                          .value
                      ),
                  })
                }
              />
            </label>

            <label>
              2º lugar

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  draft.prize_2
                }
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    prize_2:
                      Number(
                        event.target
                          .value
                      ),
                  })
                }
              />
            </label>

            <label>
              3º lugar

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  draft.prize_3
                }
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    prize_3:
                      Number(
                        event.target
                          .value
                      ),
                  })
                }
              />
            </label>

            <label>
              Data do sorteio

              <input
                type="date"
                value={
                  draft.draw_date
                }
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    draw_date:
                      event.target
                        .value,
                  })
                }
              />
            </label>

            <button
              className="btn primary"
              disabled={loading}
            >
              {loading
                ? "Salvando..."
                : "Salvar configurações"}
            </button>

            {draft.updated_at && (
              <small className="last-update">
                Última atualização:{" "}
                {new Date(
                  draft.updated_at
                ).toLocaleString(
                  "pt-BR"
                )}
              </small>
            )}
          </form>
        </section>

        {/* SORTEIO */}

        <section className="admin-card draw-card">
          <div className="card-head">
            <div>
              <Gift size={20} />

              <h2>
                Sorteio
              </h2>
            </div>

            <span>
              {dateBR(
                settings.draw_date
              )}
            </span>
          </div>

          {!drawUnlocked && (
            <div className="draw-locked">
              <LockKeyhole
                size={22}
              />

              <div>
                <strong>
                  Sorteio bloqueado
                </strong>

                <span>
                  Os sorteios serão
                  liberados em{" "}
                  {dateBR(
                    settings.draw_date
                  )}
                </span>
              </div>
            </div>
          )}

          <div className="draw-prizes">
            {[1, 2, 3].map(
              (position) => {
                const result =
                  drawResults.find(
                    (item) =>
                      item.prize_position ===
                      position
                  );

                const prize =
                  position === 1
                    ? settings.prize_1
                    : position === 2
                    ? settings.prize_2
                    : settings.prize_3;

                return (
                  <div
                    className="draw-prize"
                    key={
                      position
                    }
                  >
                    <div className="draw-prize-title">
                      <span>
                        {position}º lugar
                      </span>

                      <strong>
                        {money(
                          Number(
                            prize
                          )
                        )}
                      </strong>
                    </div>

                    {result ? (
                      <div className="draw-winner">
                        <span>
                          Número sorteado
                        </span>

                        <strong className="winner-number">
                          {String(
                            result.ticket_number
                          ).padStart(
                            2,
                            "0"
                          )}
                        </strong>

                        <div>
                          <small>
                            Nome
                          </small>

                          <b>
                            {
                              result.buyer_name
                            }
                          </b>
                        </div>

                        <div>
                          <small>
                            Telefone / WhatsApp
                          </small>

                          <b>
                            {result.buyer_phone ||
                              "Não informado"}
                          </b>
                        </div>

                        <div>
                          <small>
                            Código da reserva
                          </small>

                          <b>
                            {result.reservation_id
                              .slice(
                                0,
                                8
                              )
                              .toUpperCase()}
                          </b>
                        </div>

                        <small>
                          Sorteado em{" "}
                          {new Date(
                            result.drawn_at
                          ).toLocaleString(
                            "pt-BR"
                          )}
                        </small>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn primary full"
                        disabled={
                          !drawUnlocked ||
                          drawingPrize !==
                            null
                        }
                        onClick={() =>
                          drawPrize(
                            position
                          )
                        }
                      >
                        {!drawUnlocked
                          ? "Aguardando data do sorteio"
                          : drawingPrize ===
                            position
                          ? "Sorteando..."
                          : `Sortear ${position}º prêmio`}
                      </button>
                    )}
                  </div>
                );
              }
            )}
          </div>
        </section>

        {/* PAGAMENTOS */}

        <section className="admin-card">
          <div className="card-head">
            <div>
              <Ticket size={20} />

              <h2>
                Pagamentos
              </h2>
            </div>

            <span>
              Confirme ou libere as reservas
            </span>
          </div>

          <div className="admin-payment-warning">
            <strong>
              Antes de confirmar:
            </strong>

            <span>
              Confirme o Pix somente
              após conferir o
              comprovante e o
              recebimento do valor.
              <b> Liberar</b> significa
              cancelar a reserva e
              devolver o número para
              ficar disponível
              novamente.
            </span>
          </div>

          <div className="payment-filters">
            <button
              type="button"
              className={
                statusFilter ===
                "all"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setStatusFilter(
                  "all"
                )
              }
            >
              Todas
            </button>

            <button
              type="button"
              className={
                statusFilter ===
                "pending"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setStatusFilter(
                  "pending"
                )
              }
            >
              Pendentes
            </button>

            <button
              type="button"
              className={
                statusFilter ===
                "paid"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setStatusFilter(
                  "paid"
                )
              }
            >
              Confirmadas
            </button>

            <button
              type="button"
              className={
                statusFilter ===
                "cancelled"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setStatusFilter(
                  "cancelled"
                )
              }
            >
              Canceladas
            </button>
          </div>

          {filteredReservations.length ===
          0 ? (
            <div className="empty">
              Nenhuma reserva
              encontrada neste filtro.
            </div>
          ) : (
            <div className="orders">
              {filteredReservations.map(
                (
                  reservation
                ) => (
                  <div
                    className="order"
                    key={
                      reservation.id
                    }
                  >
                    <div className="order-main">
                      <div className="order-name">
                        <b>
                          {
                            reservation.buyer_name
                          }
                        </b>

                        <span>
                          {
                            reservation.relationship
                          }
                        </span>
                      </div>

                      <div className="order-numbers">
                        {reservation.ticket_numbers.map(
                          (
                            number
                          ) => (
                            <b
                              key={
                                number
                              }
                            >
                              {String(
                                number
                              ).padStart(
                                2,
                                "0"
                              )}
                            </b>
                          )
                        )}
                      </div>

                      {reservation.message && (
                        <p>
                          “
                          {
                            reservation.message
                          }
                          ”
                        </p>
                      )}
                    </div>

                    <div className="order-side">
                      <strong>
                        {money(
                          Number(
                            reservation.total_amount
                          )
                        )}
                      </strong>

                      <span
                        className={`status ${reservation.status}`}
                      >
                        {reservation.status ===
                        "pending"
                          ? "Aguardando"
                          : reservation.status ===
                            "paid"
                          ? "Pago"
                          : "Cancelado"}
                      </span>

                      {reservation.status ===
                        "pending" && (
                        <div className="order-actions">
                          <button
                            type="button"
                            onClick={() =>
                              updateReservation(
                                reservation.id,
                                "paid"
                              )
                            }
                          >
                            <CheckCircle2
                              size={16}
                            />

                            Confirmar Pix
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              updateReservation(
                                reservation.id,
                                "cancelled"
                              )
                            }
                          >
                            <XCircle
                              size={16}
                            />

                            Liberar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {paidReservations.length >
            0 && (
            <small className="last-update">
              {
                paidReservations.length
              }{" "}
              reserva
              {paidReservations.length ===
              1
                ? ""
                : "s"}{" "}
              paga
              {paidReservations.length ===
              1
                ? ""
                : "s"}{" "}
              •{" "}
              {paidTickets} cota
              {paidTickets ===
              1
                ? ""
                : "s"}{" "}
              confirmada
              {paidTickets ===
              1
                ? ""
                : "s"}
            </small>
          )}
        </section>
      </div>
    </div>
  );
}