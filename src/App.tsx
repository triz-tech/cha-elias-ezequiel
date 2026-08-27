import { useEffect, useState } from "react";
import {
  ArrowRight,
  Baby,
  CheckCircle2,
  Copy,
  Gift,
  Heart,
  Instagram,
  LockKeyhole,
  LogOut,
  MessageCircle,
  RefreshCw,
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
  prize_1: 900,
  prize_2: 400,
  prize_3: 200,
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

const WHATSAPP_PAIS = "5521980069468";

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

  const [reservation, setReservation] =
    useState<Reservation | null>(null);

  const [toast, setToast] = useState("");

  const [consultCode, setConsultCode] = useState("");

  const [consultResults, setConsultResults] =
  useState<ConsultResult[]>([]);

  const [consultLoading, setConsultLoading] = useState(false);
  const [consultError, setConsultError] = useState("");

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
    console.log("CONFIGURAÇÕES CARREGADAS:", data);

    setSettings(data as RaffleSettings);
  }
}

  async function consultReservation() {
    const client = supabase;

    if (!client) {
      setConsultError("A consulta está temporariamente indisponível.");
      return;
    }

    const code = consultCode.trim();

    if (!code) {
      setConsultError("Digite o código da sua reserva.");
      return;
    }

    setConsultLoading(true);
    setConsultError("");
    setConsultResults([]);

const { data, error } = await client.rpc("find_reservation", {
  p_search: code,
});

    setConsultLoading(false);

    if (error) {
      console.error(error);
      setConsultError("Não foi possível consultar a reserva.");
      return;
    }

if (!data || data.length === 0) {
  setConsultError("Reserva não encontrada.");
  return;
}

setConsultResults(data as ConsultResult[]);
  }

  async function copyPix() {
    const pix = settings.pix_key?.trim();

    if (!pix) {
      setToast("Chave Pix ainda não configurada.");
      setTimeout(() => setToast(""), 2200);
      return;
    }

    try {
      await navigator.clipboard.writeText(pix);
      setToast("Chave Pix copiada!");

      setTimeout(() => {
        setToast("");
      }, 2200);
    } catch (error) {
      console.error("Erro ao copiar Pix:", error);
      setToast("Não foi possível copiar a chave Pix.");
    }
  }

  useEffect(() => {
    void loadPublic();

    const client = supabase;
    if (!client) return;

    void client.auth
      .getSession()
      .then(({ data }) => setAdmin(Boolean(data.session)));

    const { data: listener } = client.auth.onAuthStateChange(
      (_event, session) => {
        setAdmin(Boolean(session));
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

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
          table: "raffle_settings",
        },
        () => {
          void loadPublic();
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
    setShowAdmin(false);
  }}
  onRefresh={loadPublic}
  onSettingsChange={setSettings}
  setToast={setToast}
/>
    );
  }

  return (
    <div className="app">
      {toast && <div className="toast">{toast}</div>}

      {!isSupabaseConfigured && (
        <div className="demo-banner">
          Modo demonstração: conecte o Supabase para ativar compras,
          Pix e dashboard.
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

            <div className="hero-actions">
              <a className="btn primary" href="#comprar">
                Quero participar
                <ArrowRight size={18} />
              </a>
            </div>
              <div className="hero-draw-date">
    <span>Sorteio</span>
    <strong>{dateBR(settings.draw_date)}</strong>
  </div>

            

            <div className="trust">
              <ShieldCheck size={18} />
              Pagamento confirmado manualmente pelos pais
            </div>
          </div>

          <div className="hero-image">
            <img
              src="/capa.png"
              alt="Casal esperando os gêmeos Elias e Ezequiel"
            />

            <div className="image-badge">
              <Heart fill="currentColor" size={16} />
              Feito com amor
            </div>
          </div>
        </section>

        <section className="prizes-public">
          <span className="eyebrow">Prêmios do sorteio</span>
          
          <h2>Três chances de ganhar.</h2>

          <div className="prize-list">
            <div className="prize first">
              <span>Meta - 1º lugar</span>
              <strong>{money(Number(settings.prize_1))}</strong>
            </div>

            <div className="prize">
              <span>Meta - 2º lugar</span>
              <strong>{money(Number(settings.prize_2))}</strong>
            </div>

            <div className="prize">
              <span>Meta - 3º lugar</span>
              <strong>{money(Number(settings.prize_3))}</strong>
            </div>
          </div>
          <p className="prize-note"> Os valores dos prêmios podem ser ajustados de acordo com a arrecadação da rifa.</p>

        </section>

        <section className="numbers-section public-rifa-info-section">
          <div className="section-head">
            <div>
              <span className="eyebrow">Números da rifa</span>
              <h2>Os números são escolhidos automaticamente.</h2>
            </div>
          </div>

          <p className="public-rifa-info">
            Você não precisa escolher um número. Ao confirmar sua
            participação, o sistema reserva automaticamente.
          </p>
        </section>

        <section className="buy-grid" id="comprar">
          <div className="how">
            <span className="eyebrow">É bem simples</span>
            <h2>Escolha sua participação.</h2>

            <div className="steps">
              <div>
                <b>01</b>
                <span>
                  <strong>Informe seus dados</strong>
                  Nome, parentesco e uma mensagem opcional.
                </span>
              </div>

              <div>
                <b>02</b>
                <span>
                  <strong>Receba os números</strong>
                  O sistema entrega automaticamente os menores
                  disponíveis.
                </span>
              </div>

              <div>
                <b>03</b>
                <span>
                  <strong>Faça o Pix</strong>
                  Copie a chave Pix ou use o QR Code. Depois os pais
                  confirmam o pagamento.
                </span>
              </div>
            </div>

            <div className="split-card">
              <Gift />

              <div>
                <b>Seu apoio faz a diferença</b>
                <span>Participe com quantas cotas quiser.</span>
                <small>
                  Os pais acompanham as reservas e confirmam os
                  pagamentos pelo painel administrativo.
                </small>
              </div>
            </div>
          </div>

<PurchaseForm
  settings={settings}
  onSuccess={setReservation}
  setToast={setToast}
  onConsultPhone={(phone) => {
    setConsultCode(phone);
    setConsultError("");
    setConsultResults([]);

    setTimeout(() => {
      document
        .querySelector(".consult-card")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }}
/>

          
        </section>

        {reservation && (
          <section className="payment-card">
            <div className="payment-info">
              <span className="eyebrow">Reserva criada</span>

<h2>Agora é só fazer o Pix 💚</h2>

<p>
  Seus números foram sorteados e reservados para você.
  O pagamento ficará <b>aguardando confirmação</b> até os
  pais conferirem o Pix.
</p>

<div className="payment-deadline">
  <strong>⏱ Importante</strong>
  <span>
    Sua reserva fica ativa por até 24 horas. Após esse prazo,
    se o pagamento não for confirmado, os números poderão ser
    liberados novamente.
  </span>
</div>

<div className="reserved-numbers">
  {reservation.ticket_numbers.map((number) => (
    <b key={number}>
      {String(number).padStart(2, "0")}
    </b>
  ))}
</div>

<div className="reservation-code-box">
  <span className="reservation-code-label">
    Código da sua reserva
  </span>

  <strong className="reservation-code">
    {reservation.id.slice(0, 8).toUpperCase()}
  </strong>

  <p className="reservation-code-help">
    A confirmação do Pix é manual e pode levar um tempinho.
    Guarde este código para acompanhar sua reserva depois.
  </p>
</div>

              <div className="amount">
                <span>Total</span>
                <strong>
                  {money(Number(reservation.total_amount))}
                </strong>
              </div>

<div className="pix-payment">
  <p className="pix-label">Chave Pix</p>

  <button
    type="button"
    className="pix-copy"
    onClick={copyPix}
  >
    <Copy size={18} />
    Copiar chave Pix
  </button>

  <p className="pix-help">
    Copie a chave e informe o valor da sua reserva no aplicativo do seu banco.
  </p>

  <div className="pix-divider">
    <span>ou</span>
  </div>

  <div className="pix-qr-area">
    <img
      src="/pix-qr.png"
      alt="QR Code Pix"
      className="pix-qr-image"
    />

    <div className="pix-details">
      <strong>Dados para conferência</strong>

      <div className="pix-detail-row">
        <span>Nome</span>
        <b>Wanderson Pereira Serafim</b>
      </div>

      <div className="pix-detail-row">
        <span>CPF</span>
        <b>•••.519.307-••</b>
      </div>

      <div className="pix-detail-row">
        <span>Banco</span>
        <b>260 - Nu Pagamentos S.A. - Instituição de Pagamento</b>
      </div>

      <small>
        Confira os dados antes de concluir o pagamento.
      </small>
    </div>
  </div>
</div>
            </div>
          </section>
        )}

        <section className="consult-card">
          <div className="consult-header">
            <span className="eyebrow">Já participou?</span>
            <h2>Consulte sua reserva</h2>

            <p>
              Digite seu telefone ou o código da reserva para acompanhar
              suas cotas e a confirmação do pagamento.
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
            <div className="consult-error">{consultError}</div>
          )}

          {consultResults.length > 0 && (
  <div className="consult-results-list">
    {consultResults.length > 1 && (
      <div className="consult-found">
        Encontramos {consultResults.length} reservas com este telefone.
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
            <strong>{result.reservation_code}</strong>
          </div>

          <strong className={`status-${result.status}`}>
            {result.status === "paid"
              ? "Pagamento confirmado ✓"
              : result.status === "pending"
              ? "Aguardando confirmação"
              : "Reserva cancelada"}
          </strong>
        </div>

        <div className="consult-tickets">
          <span>Suas cotas</span>

          <div className="reserved-numbers">
            {result.ticket_numbers.map((number) => (
              <b key={number}>
                {String(number).padStart(2, "0")}
              </b>
            ))}
          </div>
        </div>

        <div className="amount">
          <span>Valor</span>
          <strong>
            {money(Number(result.total_amount))}
          </strong>
        </div>

        {result.status === "pending" && (
          <p>
            Seu pagamento ainda está aguardando confirmação dos pais.
          </p>
        )}

        {result.status === "paid" && (
          <p className="consult-success">
            Pagamento confirmado. Obrigado por participar! 💚
          </p>
        )}
      </div>
    ))}
  </div>
)}
        </section>

        <section className="instagram-card">
          <div>
            <Instagram size={26} />

            <div>
              <span>Acompanhe o sorteio</span>
              <strong>
                {dateBR(settings.draw_date)} • {settings.instagram_1} &{" "}
                {settings.instagram_2}
              </strong>
            </div>
          </div>

          <a
            href={`https://instagram.com/${cleanInstagram(
              settings.instagram_1
            )}`}
            target="_blank"
            rel="noreferrer"
          >
            Instagram
            <ArrowRight size={17} />
          </a>
        </section>

        <section className="whatsapp-card">
          <div className="whatsapp-card-info">
            <div className="whatsapp-icon">
              <MessageCircle size={24} />
            </div>

            <div>
              <span>Ficou com alguma dúvida?</span>
              <strong>Fale diretamente com os pais</strong>
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
        <span>Feito com 💚 para a chegada de Elias & Ezequiel</span>

        <button onClick={() => setShowAdmin(true)}>
          Área administrativa
        </button>
      </footer>
    </div>
  );
}

function PurchaseForm({
  settings,
  onSuccess,
  setToast,
  onConsultPhone,
}: {
  settings: RaffleSettings;
  onSuccess: (reservation: Reservation) => void;
  setToast: (message: string) => void;
  onConsultPhone: (phone: string) => void;
}) {

  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [message, setMessage] = useState("");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState("");

  const [duplicatePhone, setDuplicatePhone] = useState(false);


  async function createReservation(allowDuplicate = false) {
  const client = supabase;

  if (!client) {
    setToast("Configure o Supabase primeiro.");
    return;
  }

  setBusy(true);

  const { data, error } = await client.rpc("reserve_tickets", {
    p_name: name.trim(),
    p_phone: phone.trim(),
    p_relationship: relationship,
    p_message: message.trim() || null,
    p_quantity: qty,
    p_allow_duplicate: allowDuplicate,
  });

  setBusy(false);

  if (error) {
    if (error.message.includes("DUPLICATE_PHONE")) {
      setDuplicatePhone(true);
      return;
    }

    setToast(error.message);
    return;
  }

  setDuplicatePhone(false);
  onSuccess(data as Reservation);
  setToast("Cotas reservadas! Agora faça o Pix.");

  window.scrollTo({
    top: document.body.scrollHeight,
    behavior: "smooth",
  });
}

async function submit(event: React.FormEvent) {
  event.preventDefault();

  if (!name.trim() || !phone.trim() || !relationship) {
    setToast("Preencha seu nome, telefone e parentesco.");
    return;
  }

  const phoneDigits = phone.replace(/\D/g, "");

  if (phoneDigits.length < 10 || phoneDigits.length > 13) {
    setToast("Digite um telefone válido com DDD.");
    return;
  }

  await createReservation(false);
}
  return (
    <form className="purchase-form" onSubmit={submit}>
      <div className="form-title">
        <span className="eyebrow">Comprar cota</span>
        <h2>Eu quero participar!</h2>
      </div>

      <label>
        Seu nome
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex.: Maria Silva"
          required
        />
      </label>

<label>
  Telefone / WhatsApp
  <input
    type="tel"
    inputMode="numeric"
    value={phone}
    onChange={(event) => setPhone(event.target.value)}
    placeholder="Ex.: (21) 99999-9999"
    required
  />
</label>

      <label>
        Você é...
        <select
          value={relationship}
          onChange={(event) => setRelationship(event.target.value)}
          required
        >
          <option value="">Selecione</option>
          <option>Pai</option>
          <option>Mãe</option>
          <option>Amigo(a) do casal</option>
          <option>Parente</option>
          <option>Outro</option>
        </select>
      </label>

      <label>
        Mensagem <span>(opcional)</span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Deixe um carinho para os gêmeos 💚"
          maxLength={240}
        />
      </label>

      <label>
        Quantidade de cotas

        <div className="qty">
          <button
            type="button"
            onClick={() => setQty(Math.max(1, qty - 1))}
          >
            −
          </button>

          <strong>{qty}</strong>

          <button
            type="button"
            onClick={() => setQty(Math.min(10, qty + 1))}
          >
            +
          </button>

          <span>{money(qty * Number(settings.price))}</span>
        </div>
      </label>

{duplicatePhone && (
  <div className="duplicate-warning">
    <strong>Você já tem uma reserva com este telefone 💚</strong>

    <p>
      Quer consultar sua reserva ou comprar mais cotas?
    </p>

    <div className="duplicate-actions">
      <button
        type="button"
        onClick={() => {
          setDuplicatePhone(false);
          onConsultPhone(phone);
        }}
      >
        Consultar reserva
      </button>

      <button
        type="button"
        onClick={() => createReservation(true)}
      >
        Comprar mais cotas
      </button>
    </div>
  </div>
)}
      <button className="btn primary full" disabled={busy}>
  {busy
    ? "Gerando reserva..."
    : `Comprar ${qty} ${
        qty > 1 ? "cotas" : "cota"
      } • ${money(qty * Number(settings.price))}`}

  <ArrowRight size={18} />
</button>

      <small className="form-note">
        Após a compra, sua cota fica reservada por até 24 horas aguardando a confirmação do Pix.
      </small>
    </form>
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
  onSettingsChange: (settings: RaffleSettings) => void;
  setToast: (message: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [draft, setDraft] = useState(settings);
  const [loading, setLoading] = useState(false);

  const [drawResults, setDrawResults] = useState<DrawResult[]>([]);
  const [drawingPrize, setDrawingPrize] = useState<number | null>(null);

  const [statusFilter, setStatusFilter] =
  useState<"all" | "pending" | "paid" | "cancelled">("all");


  async function loadReservations() {
    const client = supabase;

    if (!admin || !client) return;

    const { data, error } = await client
      .from("reservations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar reservas:", error);
      setToast(`Erro ao carregar reservas: ${error.message}`);
      return;
    }

    setReservations((data ?? []) as Reservation[]);
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
    console.error("Erro ao carregar configurações:", error);
    return;
  }

  if (data) {
    const currentSettings = data as RaffleSettings;

    setDraft(currentSettings);
    onSettingsChange(currentSettings);
  }
}

async function loadDrawResults() {
  const client = supabase;

  if (!client || !admin) return;

  const { data, error } = await client
    .from("draw_results")
    .select("*")
    .order("prize_position", {
      ascending: true,
    });

  if (error) {
    console.error("Erro ao carregar sorteio:", error);
    return;
  }

  setDrawResults((data ?? []) as DrawResult[]);
}

async function drawPrize(position: number) {
  const client = supabase;

  if (!client) return;

  const confirmed = window.confirm(
    `Tem certeza que deseja realizar o sorteio do ${position}º prêmio?\n\nO resultado ficará registrado no sistema.`
  );

  if (!confirmed) return;

  setDrawingPrize(position);

  const { error } = await client.rpc("draw_prize", {
    p_prize_position: position,
  });

  setDrawingPrize(null);

  if (error) {
    setToast(error.message);
    return;
  }

  await loadDrawResults();

  setToast(`${position}º prêmio sorteado!`);
}
  

  async function refreshAdmin() {
    await Promise.all([loadReservations(), onRefresh()]);
  }

  async function login(event: React.FormEvent) {
    event.preventDefault();

    const client = supabase;

    if (!client) {
      setToast(
        "Configure o Supabase no .env.local antes de entrar no painel."
      );
      return;
    }

    setLoading(true);

    const { error } = await client.auth.signInWithPassword({
      email,
      password,
    });

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

    setToast("Sessão encerrada.");
  }

  async function updateReservation(
    id: string,
    status: "paid" | "cancelled"
  ) {
    const client = supabase;

    if (!client) {
      setToast("Configure o Supabase primeiro.");
      return;
    }

    const { error } = await client.rpc("set_reservation_status", {
      p_reservation_id: id,
      p_status: status,
    });

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

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();

    const client = supabase;

    if (!client) {
      setToast("Configure o Supabase primeiro.");
      return;
    }

    setLoading(true);

const { error } = await client.rpc("admin_update_settings", {
  p_price: Number(draft.price),
  p_quantity: Number(draft.quantity),
  p_prize_1: Number(draft.prize_1),
  p_prize_2: Number(draft.prize_2),
  p_prize_3: Number(draft.prize_3),
  p_draw_date: draft.draw_date,
});

    if (error) {
      setLoading(false);
      setToast(error.message);
      return;
    }

    const { data, error: reloadError } = await client
      .from("raffle_settings")
      .select("*")
      .eq("id", true)
      .single();

    setLoading(false);

    if (reloadError) {
      console.error(reloadError);
      setToast("Salvou, mas houve erro ao atualizar a tela.");
      return;
    }

    if (data) {
      const updatedSettings = data as RaffleSettings;

      setDraft(updatedSettings);
      onSettingsChange(updatedSettings);
    }

    await onRefresh();
    setToast("Configurações salvas!");
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
        <button className="back" onClick={onClose}>
          ← Voltar
        </button>

        <form className="login-card" onSubmit={login}>
          <div className="brand">
            <Baby />
            Elias <b>&</b> Ezequiel
          </div>

          <h1>Área dos pais</h1>

          <p>
            Entre com o e-mail e a senha cadastrados no Supabase.
          </p>

          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <button
            className="btn primary full"
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
            <LockKeyhole size={17} />
          </button>
        </form>
      </div>
    );
  }

const paidReservations = reservations.filter(
  (reservation) => reservation.status === "paid"
);

const pendingReservations = reservations.filter(
  (reservation) => reservation.status === "pending"
);

const filteredReservations = reservations.filter((reservation) => {
  if (statusFilter === "all") return true;
  return reservation.status === statusFilter;
});

const paidAmount = paidReservations.reduce(
  (total, reservation) =>
    total + Number(reservation.total_amount),
  0
);

const paidTickets = paidReservations.reduce(
  (total, reservation) =>
    total + Number(reservation.quantity),
  0
);


const totalPrizes =
  Number(settings.prize_1) +
  Number(settings.prize_2) +
  Number(settings.prize_3);

const balanceAfterPrizes = paidAmount - totalPrizes;

const today = new Date();

const drawDate = new Date(
  `${settings.draw_date}T00:00:00`
);

const drawUnlocked = today >= drawDate;

return (


    <div className="admin-screen">
      <div className="admin-top">
        <div className="brand">
          <Baby />
          Elias <b>&</b> Ezequiel
        </div>

        <div>
          <button
            className="btn ghost"
            onClick={() => void refreshAdmin()}
          >
            <RefreshCw size={16} />
            Atualizar
          </button>

          <button className="btn ghost" onClick={logout}>
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </div>

      <div className="admin-wrap">
        <div className="admin-title">
          <div>
            <span className="eyebrow">Dashboard</span>
            <h1>Controle da rifa</h1>
          </div>

          <div className="admin-stats">

          
            <div>
              <Users />
              <b>{paidReservations.length}</b>
              <span>pagas</span>
            </div>

            <div>
              <CheckCircle2 />
              <b>{money(paidAmount)}</b>
              <span>confirmado</span>
            </div>
            
            <div>
            <Ticket />
            <b>{paidTickets} de {settings.quantity}</b>
            <span>cotas vendidas</span>
            </div>

            <div>
              <Ticket />
              <b>{pendingReservations.length}</b>
              <span>pendentes</span>
            </div>
          </div>

          <div className={`balance-stat ${balanceAfterPrizes >= 0 ? "positive" : "negative"}`}>
  <div className="balance-icon">
    <Sparkles size={18} />
  </div>

  <div className="balance-content">
    <span>
      {balanceAfterPrizes >= 0
        ? "Saldo após os prêmios"
        : "Falta para cobrir os prêmios"}
    </span>

    <b>{money(Math.abs(balanceAfterPrizes))}</b>

    <small>
      Prêmios: {money(totalPrizes)}
    </small>
  </div>
</div>

          
        </div>

        <section className="admin-card">
          <div className="card-head">
            <div>
              <Settings size={20} />
              <h2>Configurações</h2>
            </div>

            <span>Edite sem mexer no código</span>
          </div>

          <form
            className="settings-form"
            onSubmit={saveSettings}
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
                    price: Number(event.target.value),
                  })
                }
              />
            </label>

            <label>
              Quantidade total de cotas
              <input
                type="number"
                min="1"
                value={draft.quantity}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    quantity: Number(event.target.value),
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
                value={draft.prize_1}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    prize_1: Number(event.target.value),
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
                value={draft.prize_2}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    prize_2: Number(event.target.value),
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
                value={draft.prize_3}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    prize_3: Number(event.target.value),
                  })
                }
              />
            </label>

            <label>
               Data do sorteio
               <input
    type="date"
    value={draft.draw_date}
    onChange={(event) =>
      setDraft({
        ...draft,
        draw_date: event.target.value,
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
                {new Date(draft.updated_at).toLocaleString(
                  "pt-BR"
                )}
              </small>
            )}
          </form>
        </section>

<section className="admin-card draw-card">
  <div className="card-head">
    <div>
      <Gift size={20} />
      <h2>Sorteio</h2>
    </div>

    <span>{dateBR(settings.draw_date)}</span>
  </div>

  {!drawUnlocked && (
    <div className="draw-locked">
      <LockKeyhole size={22} />

      <div>
        <strong>Sorteio bloqueado</strong>
        <span>
          Os sorteios serão liberados em{" "}
          {dateBR(settings.draw_date)}
        </span>
      </div>
    </div>
  )}

  <div className="draw-prizes">
    {[1, 2, 3].map((position) => {
      const result = drawResults.find(
        (item) => item.prize_position === position
      );

      const prize =
        position === 1
          ? settings.prize_1
          : position === 2
          ? settings.prize_2
          : settings.prize_3;

      return (
        <div className="draw-prize" key={position}>
          <div className="draw-prize-title">
            <span>{position}º lugar</span>
            <strong>{money(Number(prize))}</strong>
          </div>

          {result ? (
            <div className="draw-winner">
              <span>Número sorteado</span>

              <strong className="winner-number">
                {String(result.ticket_number).padStart(2, "0")}
              </strong>

              <div>
                <small>Nome</small>
                <b>{result.buyer_name}</b>
              </div>

              <div>
                <small>Telefone / WhatsApp</small>
                <b>{result.buyer_phone || "Não informado"}</b>
              </div>

              <div>
                <small>Código da reserva</small>
                <b>
                  {result.reservation_id
                    .slice(0, 8)
                    .toUpperCase()}
                </b>
              </div>

              <small>
                Sorteado em{" "}
                {new Date(result.drawn_at).toLocaleString("pt-BR")}
              </small>
            </div>
          ) : (
            <button
              type="button"
              className="btn primary full"
              disabled={!drawUnlocked || drawingPrize !== null}
              onClick={() => drawPrize(position)}
            >
              {!drawUnlocked
                ? "Aguardando data do sorteio"
                : drawingPrize === position
                ? "Sorteando..."
                : `Sortear ${position}º prêmio`}
            </button>
          )}
        </div>
      );
    })}
  </div>
</section>


<section className="admin-card">
  <div className="card-head">
    <div>
      <Ticket size={20} />
      <h2>Pagamentos</h2>
    </div>

    <span>Confirme ou libere as reservas</span>
  </div>

  <div className="admin-payment-warning">
    <strong>Antes de confirmar:</strong>
    <span>
      Confirme o Pix somente após conferir o comprovante e o recebimento do valor.
      <b> Liberar</b> significa cancelar a reserva e devolver o número para ficar disponível novamente.
    </span>
  </div>

  

  {/* daqui pra baixo continua sua lista de pagamentos */}
<div className="payment-filters">
  <button
    type="button"
    className={statusFilter === "all" ? "active" : ""}
    onClick={() => setStatusFilter("all")}
  >
    Todas
  </button>

  <button
    type="button"
    className={statusFilter === "pending" ? "active" : ""}
    onClick={() => setStatusFilter("pending")}
  >
    Pendentes
  </button>

  <button
    type="button"
    className={statusFilter === "paid" ? "active" : ""}
    onClick={() => setStatusFilter("paid")}
  >
    Confirmadas
  </button>

  <button
    type="button"
    className={statusFilter === "cancelled" ? "active" : ""}
    onClick={() => setStatusFilter("cancelled")}
  >
    Canceladas
  </button>
</div>

{filteredReservations.length === 0 ? (
  <div className="empty">
    Nenhuma reserva encontrada neste filtro.
  </div>
) : (
  <div className="orders">
    {filteredReservations.map((reservation) => (
                <div className="order" key={reservation.id}>
                  <div className="order-main">
                    <div className="order-name">
                      <b>{reservation.buyer_name}</b>
                      <span>{reservation.relationship}</span>
                    </div>

                    <div className="order-numbers">
                      {reservation.ticket_numbers.map((number) => (
                        <b key={number}>
                          {String(number).padStart(2, "0")}
                        </b>
                      ))}
                    </div>

                    {reservation.message && (
                      <p>“{reservation.message}”</p>
                    )}
                  </div>

                  <div className="order-side">
                    <strong>
                      {money(Number(reservation.total_amount))}
                    </strong>

                    <span
                      className={`status ${reservation.status}`}
                    >
                      {reservation.status === "pending"
                        ? "Aguardando"
                        : reservation.status === "paid"
                        ? "Pago"
                        : "Cancelado"}
                    </span>

                    {reservation.status === "pending" && (
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
                          <CheckCircle2 size={16} />
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
                          <XCircle size={16} />
                          Liberar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {paidReservations.length > 0 && (
            <small className="last-update">
              {paidReservations.length} reserva
              {paidReservations.length === 1 ? "" : "s"} paga
              {paidReservations.length === 1 ? "" : "s"} •{" "}
              {paidTickets} cota
              {paidTickets === 1 ? "" : "s"} confirmada
              {paidTickets === 1 ? "" : "s"}
            </small>
          )}
        </section>
      </div>
    </div>
  );
}