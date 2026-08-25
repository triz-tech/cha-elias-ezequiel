import { useEffect, useMemo, useState } from "react";
import { Heart, Baby, Gift, Instagram, ShieldCheck, Sparkles, ArrowRight, LockKeyhole, LogOut, CheckCircle2, XCircle, Settings, Users, Ticket, Copy, RefreshCw } from "lucide-react";
import { supabase, isSupabaseConfigured, RaffleSettings, Reservation } from "./lib/supabase";


const fallbackSettings: RaffleSettings = {
  id: true,
  title: "Rifa do Elias & Ezequiel",
  price: 15,
  quantity: 50,
  prize_percent: 20,
  display_prize: 150,
  draw_date: "2026-10-01",
  instagram_1: "@wandersonpz",
  instagram_2: "@duda_gentill",
  pix_key: "",
  pix_name: "ELIAS EZEQUIEL",
  pix_city: "RIO DE JANEIRO",
  
  intro: "Uma rifa feita com carinho para ajudar na chegada dos nossos gêmeos.",
};

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function dateBR(v: string) {
  if (!v) return "";
  const [y,m,d] = v.split("-");
  return `${d}/${m}/${y}`;
}
function cleanInstagram(v: string) {
  return v.replace(/^@/, "");
}

export default function App() {
  const [admin, setAdmin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [settings, setSettings] = useState<RaffleSettings>(fallbackSettings);
  const [loading, setLoading] = useState(true);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [toast, setToast] = useState("");

  const [consultCode, setConsultCode] = useState("");
  const [consultResult, setConsultResult] = useState<any>(null);
  const [consultLoading, setConsultLoading] = useState(false);
  const [consultError, setConsultError] = useState("");

  async function consultReservation() {
  if (!supabase) return;

  const code = consultCode.trim();

  if (!code) {
    setConsultError("Digite o código da sua reserva.");
    return;
  }

  setConsultLoading(true);
  setConsultError("");
  setConsultResult(null);

  const { data, error } = await supabase.rpc(
    "consult_reservation",
    {
      p_code: code,
    }
  );

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

  setConsultResult(data[0]);
}

async function loadPublic() {
  setLoading(true);

  if (!isSupabaseConfigured || !supabase) {
    setSettings(fallbackSettings);
    setLoading(false);
    return;
  }

  const { data, error } = await supabase
    .from("raffle_settings")
    .select("*")
    .eq("id", true)
    .single();

  if (error) {
    console.error("Erro ao carregar configurações:", error);
    setLoading(false);
    return;
  }

  if (data) {
    setSettings(data);
  }

  setLoading(false);
}

  useEffect(() => {
    loadPublic();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setAdmin(!!data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setAdmin(!!session));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    const channel = client.channel("raffle-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "raffle_settings" }, loadPublic)
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, []);


async function copyPix() {
  const pix = settings.pix_key?.trim();

  if (!pix) {
    setToast("Pix ainda não configurado.");
    setTimeout(() => setToast(""), 2200);
    return;
  }

  try {
    await navigator.clipboard.writeText(pix);

    setToast("Código Pix copiado!");

    setTimeout(() => {
      setToast("");
    }, 2200);
  } catch (error) {
    console.error("Erro ao copiar Pix:", error);
    setToast("Não foi possível copiar o código Pix.");
  }
}

  if (showAdmin) {
return <AdminPage
  settings={settings}
  admin={admin}
  onClose={() => setShowAdmin(false)}
  onRefresh={loadPublic}
  onSettingsChange={setSettings}
  setToast={setToast}
/>;
  }

  return (
    <div className="app">
      {toast && <div className="toast">{toast}</div>}
      {!isSupabaseConfigured && <div className="demo-banner">Modo demonstração: conecte o Supabase para ativar compras, Pix e dashboard.</div>}
      <header className="topbar">
        <div className="brand"><Baby size={22}/><span>Elias <b>&</b> Ezequiel</span></div>
        <button className="admin-link" onClick={() => setShowAdmin(true)}><LockKeyhole size={16}/> Área dos pais</button>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow"><Sparkles size={15}/> Chá de bebê dos gêmeos</span>
            <h1>Uma cota, um carinho,<br/><em>dois sonhos.</em></h1>
            <p>{settings.intro}</p>
            <div className="hero-actions">
              <a className="btn primary" href="#comprar">Quero participar <ArrowRight size={18}/></a>
            </div>
            <div className="trust"><ShieldCheck size={18}/> Pagamento confirmado manualmente pelos pais</div>
          </div>
          <div className="hero-image">
            <img src="/capa.png" alt="Casal esperando os gêmeos Elias e Ezequiel" />
            <div className="image-badge"><Heart fill="currentColor" size={16}/> Feito com amor</div>
          </div>
        </section>

        <section className="prize-highlight">
  <span className="eyebrow">Prêmio dos gêmeos</span>
  <h2>{money(Number(settings.display_prize))}</h2>
  <p>
    O valor do prêmio é calculado automaticamente conforme as configurações da rifa.
  </p>
</section>




        <section className="numbers-section public-rifa-info-section">
          <div className="section-head">
            <div>
              <span className="eyebrow">Números da rifa</span>
              <h2>Os números são escolhidos automaticamente.</h2>
            </div>
          </div>
          <p className="public-rifa-info">
            Você não precisa escolher um número. Ao confirmar sua participação, o sistema reserva automaticamente os menores números disponíveis, em ordem crescente.
          </p>
        </section>

        <section className="buy-grid" id="comprar">
          <div className="how">
            <span className="eyebrow">É bem simples</span>
            <h2>Escolha sua participação.</h2>
            <div className="steps">
              <div><b>01</b><span><strong>Informe seus dados</strong>Nome, parentesco e uma mensagem opcional.</span></div>
              <div><b>02</b><span><strong>Receba os números</strong>O sistema entrega automaticamente os menores disponíveis.</span></div>
               <div>
                <b>03</b>
                <span>
                  <strong>Faça o Pix</strong>
                  Copie o código Pix e faça o pagamento. Depois os pais confirmam.
                </span>
              </div>
          
            </div>
            <div className="split-card"><Gift/><div><b>Seu apoio faz a diferença</b><span>Participe com quantas cotas quiser.</span><small>Os pais acompanham as reservas e confirmam os pagamentos pelo painel administrativo.</small></div></div>
          </div>
          <PurchaseForm settings={settings} onSuccess={setReservation} setToast={setToast}/>
        </section>

{reservation && (
  <section className="payment-card">
    <div className="payment-info">
      <span className="eyebrow">Reserva criada</span>

      <h2>Agora é só fazer o Pix 💜</h2>

      <p>
        Suas cotas foram separadas em ordem crescente.
        O pagamento ficará <b>aguardando confirmação</b> até os pais conferirem o Pix.
      </p>

      <div className="reserved-numbers">
        {reservation.ticket_numbers.map((n) => (
          <b key={n}>{String(n).padStart(2, "0")}</b>
        ))}
      </div>

      <div className="reservation-code-box">
        <span>Código da sua reserva</span>

        <strong>
          {reservation.id.slice(0, 8).toUpperCase()}
        </strong>

        <small>
          Guarde este código para consultar sua reserva depois.
        </small>
      </div>

      <div className="amount">
        <span>Total</span>
        <strong>{money(reservation.total_amount)}</strong>
      </div>

      {settings.pix_key?.trim() ? (
        <div className="pix-payment">
          <p className="pix-label">Pix copia e cola</p>

          <button
            type="button"
            className="pix-copy"
            onClick={copyPix}
          >
            <Copy size={18} />
            Copiar código Pix
          </button>

          <p className="pix-help">
            Copie o código e cole na opção <b>Pix copia e cola</b> do seu banco.
          </p>
        </div>
      ) : (
        <div className="pix-warning">
          Os pais ainda precisam cadastrar o Pix no painel administrativo.
        </div>
      )}

      <small>
        Guarde estes números até a confirmação do pagamento.
      </small>
    </div>
  </section>
)}


<section className="consult-card">
  <div className="consult-header">
    <span className="eyebrow">Já participou?</span>
    <h2>Consulte sua reserva</h2>
    <p>
      Digite o código que você recebeu no momento da reserva para
      acompanhar suas cotas e a confirmação do pagamento.
    </p>
  </div>

  <div className="consult-form">
    <input
      type="text"
      value={consultCode}
      onChange={(e) => setConsultCode(e.target.value.toUpperCase())}
      placeholder="Ex.: DF6808A6"
      maxLength={8}
    />

    <button
      type="button"
      onClick={consultReservation}
      disabled={consultLoading}
    >
      {consultLoading ? "Consultando..." : "Consultar reserva"}
    </button>
  </div>

  {consultError && (
    <div className="consult-error">
      {consultError}
    </div>
  )}

  {consultResult && (
    <div className="consult-result">

      <div className="consult-status">
        <span>Status</span>

        <strong className={`status-${consultResult.status}`}>
          {consultResult.status === "paid"
            ? "Pagamento confirmado ✓"
            : consultResult.status === "pending"
            ? "Aguardando confirmação"
            : "Reserva cancelada"}
        </strong>
      </div>

      <div className="consult-tickets">
        <span>Suas cotas</span>

        <div className="reserved-numbers">
          {consultResult.ticket_numbers.map((n: number) => (
            <b key={n}>
              {String(n).padStart(2, "0")}
            </b>
          ))}
        </div>
      </div>

      <div className="amount">
        <span>Valor</span>
        <strong>
          {money(Number(consultResult.total_amount))}
        </strong>
      </div>

      {consultResult.status === "pending" && (
        <p>
          Seu pagamento ainda está aguardando confirmação dos pais.
        </p>
      )}

      {consultResult.status === "paid" && (
        <p className="consult-success">
          Pagamento confirmado. Obrigado por participar! 💜
        </p>
      )}
    </div>
  )}
</section>


        <section className="instagram-card">
          <div><Instagram size={26}/><div><span>Acompanhe o sorteio</span><strong>{dateBR(settings.draw_date)} • {settings.instagram_1} & {settings.instagram_2}</strong></div></div>
          <a href={`https://instagram.com/${cleanInstagram(settings.instagram_1)}`} target="_blank" rel="noreferrer">Instagram <ArrowRight size={17}/></a>
        </section>
      </main>

      <footer><span>Feito com 💜 para a chegada de Elias & Ezequiel</span><button onClick={() => setShowAdmin(true)}>Área administrativa</button></footer>
    </div>
  );
}

function PurchaseForm({ settings, onSuccess, setToast }: {settings:RaffleSettings; onSuccess:(r:Reservation)=>void; setToast:(s:string)=>void}) {
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [message, setMessage] = useState("");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !relationship) return setToast("Preencha seu nome e parentesco.");
    if (!supabase) return setToast("Modo demonstração. Configure o Supabase no arquivo .env.local para ativar a compra.");
    setBusy(true);
    const { data, error } = await supabase.rpc("reserve_tickets", {
      p_name: name.trim(), p_relationship: relationship, p_message: message.trim() || null, p_quantity: qty
    });
    setBusy(false);
    if (error) return setToast(error.message.includes("available") ? "Não há cotas suficientes disponíveis." : error.message);
    onSuccess(data as Reservation);
    setToast("Cotas reservadas! Agora faça o Pix.");
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }
  return <form className="purchase-form" onSubmit={submit}>
    <div className="form-title"><span className="eyebrow">Comprar cota</span><h2>Eu quero participar!</h2></div>
    <label>Seu nome<input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Maria Silva" required/></label>
    <label>Você é...<select value={relationship} onChange={e=>setRelationship(e.target.value)} required><option value="">Selecione</option><option>Pai</option><option>Mãe</option><option>Amigo(a) do casal</option><option>Parente</option><option>Outro</option></select></label>
    <label>Mensagem <span>(opcional)</span><textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Deixe um carinho para os gêmeos 💜" maxLength={240}/></label>
    <label>Quantidade de cotas<div className="qty"><button type="button" onClick={()=>setQty(Math.max(1,qty-1))}>−</button><strong>{qty}</strong><button type="button" onClick={()=>setQty(Math.min(10,qty+1))}>+</button><span>{money(qty * Number(settings.price))}</span></div></label>
    <button className="btn primary full" disabled={busy}>{busy ? "Reservando..." : `Reservar ${qty} ${qty > 1 ? "cotas" : "cota"} • ${money(qty * Number(settings.price))}`} <ArrowRight size={18}/></button>
    <small className="form-note">Os números são atribuídos automaticamente do menor para o maior.</small>
  </form>;
}

function AdminPage({
  settings,
  admin,
  onClose,
  onRefresh,
  onSettingsChange,
  setToast
}: {
  settings: RaffleSettings;
  admin: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onSettingsChange: (settings: RaffleSettings) => void;
  setToast: (s:string) => void;
}) {

  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [reservations,setReservations]=useState<Reservation[]>([]);
  const [draft,setDraft]=useState(settings);
  const [loading,setLoading]=useState(false);

async function load() {
  if (!admin || !supabase) return;

  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar reservas:", error);
    setToast(`Erro ao carregar reservas: ${error.message}`);
    return;
  }

  setReservations(data ?? []);
}
  useEffect(()=>{setDraft(settings); load()},[admin,settings]);

  async function login(e:React.FormEvent) {
    e.preventDefault();
    if (!supabase) return setToast("Configure o Supabase no .env.local antes de entrar no painel.");
    setLoading(true);
    const {error}=await supabase.auth.signInWithPassword({email,password});
    setLoading(false);
    if(error) setToast("Login inválido.");
  }
  async function logout(){if (supabase) await supabase.auth.signOut();setToast("Sessão encerrada.");}
  async function updateReservation(id:string,status:"paid"|"cancelled") {
    if (!supabase) return setToast("Configure o Supabase primeiro.");
    const {error}=await supabase.rpc("set_reservation_status",{p_reservation_id:id,p_status:status});
    if(error) setToast(error.message); else {setToast(status==="paid"?"Pagamento confirmado!":"Reserva liberada."); await load(); await onRefresh();}
  }
async function saveSettings(e: React.FormEvent) {
  e.preventDefault();

  if (!supabase) {
    return setToast("Configure o Supabase primeiro.");
  }

  setLoading(true);

  const { error } = await supabase.rpc("admin_update_settings", {
    p_price: Number(draft.price),
    p_quantity: Number(draft.quantity),
    p_prize_percent: Number(draft.prize_percent),
    p_display_prize: Number(draft.display_prize),
    p_draw_date: draft.draw_date,
    p_instagram_1: draft.instagram_1,
    p_instagram_2: draft.instagram_2,
    p_pix_key: draft.pix_key,
    p_pix_name: draft.pix_name,
    p_pix_city: draft.pix_city,
    p_intro: draft.intro
  });

  if (error) {
    setLoading(false);
    setToast(error.message);
    return;
  }

  const { data, error: reloadError } = await supabase
    .from("raffle_settings")
    .select("*")
    .eq("id", true)
    .single();

  setLoading(false);

  if (reloadError) {
    setToast("Salvou, mas não conseguiu atualizar a tela.");
    console.error(reloadError);
    return;
  }

  if (data) {
    setDraft(data);
    onSettingsChange(data);
  }

  await onRefresh();

  setToast("Configurações salvas!");
}

  if(!admin) return <div className="admin-screen"><button className="back" onClick={onClose}>← Voltar</button><form className="login-card" onSubmit={login}><div className="brand"><Baby/> Elias <b>&</b> Ezequiel</div><h1>Área dos pais</h1><p>Entre com o e-mail e a senha cadastrados no Supabase.</p><label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Senha<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><button className="btn primary full" disabled={loading}>{loading?"Entrando...":"Entrar"} <LockKeyhole size={17}/></button></form></div>;

  const paid=reservations.filter(r=>r.status==="paid").reduce((a,r)=>a+r.total_amount,0);
  const pendingRes=reservations.filter(r=>r.status==="pending");
  return <div className="admin-screen">
    <div className="admin-top"><div className="brand"><Baby/> Elias <b>&</b> Ezequiel</div><div><button className="btn ghost" onClick={onRefresh}><RefreshCw size={16}/> Atualizar</button><button className="btn ghost" onClick={logout}><LogOut size={16}/> Sair</button></div></div>
    <div className="admin-wrap">
      <div className="admin-title"><div><span className="eyebrow">Dashboard</span><h1>Controle da rifa</h1></div><div className="admin-stats"><div><Users/><b>{reservations.length}</b><span>reservas</span></div><div><CheckCircle2/><b>{money(paid)}</b><span>confirmado</span></div><div><Ticket/><b>{pendingRes.length}</b><span>pendentes</span></div></div></div>

      <section className="admin-card"><div className="card-head"><div><Settings size={20}/><h2>Configurações</h2></div><span>Edite sem mexer no código</span></div>
        <form className="settings-form" onSubmit={saveSettings}>
          <label>Valor da cota<input type="number" min="1" step="0.01" value={draft.price} onChange={e=>setDraft({...draft,price:Number(e.target.value)})}/></label>
          <label>Quantidade de cotas<input type="number" min="1" value={draft.quantity} onChange={e=>setDraft({...draft,quantity:Number(e.target.value)})}/></label>
          <label>Prêmio exibido no site<input    type="number" min="0" step="0.01" value={draft.display_prize} onChange={(e) => setDraft({ ...draft, display_prize: Number(e.target.value) })}/> </label>
          <label>% do prêmio<input type="number" min="0" max="100" value={draft.prize_percent} onChange={e=>setDraft({...draft,prize_percent:Number(e.target.value)})}/></label>
          <label>Data do sorteio<input type="date" value={draft.draw_date} onChange={e=>setDraft({...draft,draw_date:e.target.value})}/></label>
          <label>Instagram 1<input value={draft.instagram_1} onChange={e=>setDraft({...draft,instagram_1:e.target.value})}/></label>
          <label>Instagram 2<input value={draft.instagram_2} onChange={e=>setDraft({...draft,instagram_2:e.target.value})}/></label>
          <label className="wide">Pix Copia e Cola<textarea
    value={draft.pix_key}
    onChange={(e) =>
      setDraft({
        ...draft,
        pix_key: e.target.value
      })
    }
    placeholder="Cole aqui o código Pix Copia e Cola gerado pelo seu banco"
  />
  <small>
    Cole aqui o código completo gerado pelo aplicativo do banco.
  </small>
</label>
          
          <label>Nome no Pix<input value={draft.pix_name} onChange={e=>setDraft({...draft,pix_name:e.target.value})}/></label>
          <label>Cidade do Pix<input value={draft.pix_city} onChange={e=>setDraft({...draft,pix_city:e.target.value})}/></label>
          <label className="wide">Texto de apresentação<textarea value={draft.intro} onChange={e=>setDraft({...draft,intro:e.target.value})}/></label>
          <div className="math wide"><b>Automático:</b> se todas as {draft.quantity} cotas forem vendidas a {money(Number(draft.price))}, arrecada {money(Number(draft.quantity)*Number(draft.price))}; prêmio ({draft.prize_percent}%) = {money(Number(draft.quantity)*Number(draft.price)*Number(draft.prize_percent)/100)}; gêmeos = {money(Number(draft.quantity)*Number(draft.price)*(100-Number(draft.prize_percent))/100)}.</div>
          <button className="btn primary" disabled={loading}>{loading?"Salvando...":"Salvar configurações"}</button>
        </form>
      </section>

      <section className="admin-card"><div className="card-head"><div><Ticket size={20}/><h2>Pagamentos</h2></div><span>Confirme ou libere as reservas</span></div>
        {reservations.length===0 ? <div className="empty">Ainda não há reservas.</div> : <div className="orders">{reservations.map(r=><div className="order" key={r.id}>
          <div className="order-main"><div className="order-name"><b>{r.buyer_name}</b><span>{r.relationship}</span></div><div className="order-numbers">{r.ticket_numbers.map(n=><b key={n}>{String(n).padStart(2,"0")}</b>)}</div>{r.message&&<p>“{r.message}”</p>}</div>
          <div className="order-side"><strong>{money(r.total_amount)}</strong><span className={`status ${r.status}`}>{r.status==="pending"?"Aguardando":r.status==="paid"?"Pago":"Cancelado"}</span>{r.status==="pending"&&<div className="order-actions"><button onClick={()=>updateReservation(r.id,"paid")}><CheckCircle2 size={16}/> Confirmar Pix</button><button onClick={()=>updateReservation(r.id,"cancelled")}><XCircle size={16}/> Liberar</button></div>}</div>
        </div>)}</div>}
      </section>
    </div>
  </div>
}
