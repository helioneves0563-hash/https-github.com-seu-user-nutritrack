import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Camera, MessageSquare, BarChart2, Bell, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react';
import { auth } from '../services/supabase';
import { useAuth } from '../context/AuthContextObj';

export default function Login() {
    const { user, role: userRole, loading: authLoading } = useAuth();

    // Estados de navegação interna
    const [step, setStep] = useState('role'); // 'role', 'form', 'forgot', 'success'
    const [authTab, setAuthTab] = useState('login'); // 'login', 'register'
    const [role, setRole] = useState(null); // 'nutricionista', 'cliente'
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Estados dos formulários
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [nome, setNome] = useState('');
    const [sobrenome, setSobrenome] = useState('');
    const [crn, setCrn] = useState('');
    const [especialidade, setEspecialidade] = useState('');
    const [telefone, setTelefone] = useState('');
    const [codigo, setCodigo] = useState('');
    const [terms, setTerms] = useState(false);
    const [showPwd, setShowPwd] = useState(false);

    // Se o auth ainda está carregando, evita redirecionamento prematuro
    if (authLoading) {
        return (
            <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-4 border-brand-wine/30 border-t-brand-wine rounded-full animate-spin"></div>
                <p className="mt-4 text-brand-wine font-serif font-medium">Validando acesso...</p>
            </div>
        );
    }

    // Se já estiver logado, redireciona quando o papel estiver resolvido
    if (user) {
        if (userRole === 'nutricionista') {
            return <Navigate to="/nutricionista" replace />;
        }
        if (userRole === 'paciente') {
            return <Navigate to="/paciente" replace />;
        }
        return <Navigate to="/perfil" replace />;
    }

    // Ações
    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setLoading(true);
        try {
            const loginData = await auth.login(email, senha);
            const perfil = await auth.perfilAtual().catch(() => null);
            const resolvedRole = perfil?.role || loginData?.user?.user_metadata?.role || null;

            if (resolvedRole === 'nutricionista') {
                window.location.href = '/nutricionista';
                return;
            }
            if (resolvedRole === 'paciente') {
                window.location.href = '/paciente';
                return;
            }
            window.location.href = '/perfil';
        } catch (err) {
            setErrorMsg(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!terms) {
            setErrorMsg('Você precisa aceitar os termos de uso.');
            return;
        }
        setErrorMsg('');
        setLoading(true);
        try {
            if (role === 'nutricionista') {
                await auth.cadastrarNutricionista({ nome, sobrenome, email, senha, crn, especialidade, clinica: '' });
            } else {
                await auth.cadastrarPaciente({ nome, sobrenome, email, senha, telefone, codigoConvite: codigo });
            }
            setStep('success');
        } catch (err) {
            setErrorMsg(err.message || 'Erro ao criar conta.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgot = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setLoading(true);
        try {
            await auth.recuperarSenha(email);
            setStep('success');
        } catch (err) {
            setErrorMsg(err.message || 'Erro ao enviar e-mail de recuperação.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full bg-brand-cream text-brand-charcoal font-sans">

            {/* PAINEL ESQUERDO */}
            <div className="hidden md:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden bg-gradient-to-br from-[#6F0B0F] via-[#8E1216] to-brand-wine">
                <div className="absolute inset-0 pointer-events-none" style={{
                    background: 'radial-gradient(ellipse 80% 60% at 20% 80%, rgba(246,237,232,0.14) 0%, transparent 60%), radial-gradient(ellipse 60% 80% at 80% 20%, rgba(255,255,255,0.05) 0%, transparent 50%)'
                }}></div>

                {/* Decorações */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute border border-white/10 rounded-full w-[300px] h-[300px] -top-[80px] -right-[80px]"></div>
                    <div className="absolute border border-white/10 rounded-full w-[200px] h-[200px] bottom-[100px] -left-[60px]"></div>
                    <div className="absolute border border-white/10 rounded-full w-[120px] h-[120px] top-[40%] right-[10%]"></div>
                </div>

                <div className="relative z-10 font-serif text-3xl font-semibold text-white tracking-wide">
                    Nutri<span className="text-[#F6EDE8]">Track</span>
                </div>

                <div className="relative z-10 mt-12 flex-1 flex flex-col justify-center">
                    <h2 className="font-serif text-4xl lg:text-5xl font-light text-white leading-tight mb-4">
                        Acompanhamento<br /><em className="italic text-[#F6EDE8]">inteligente</em>
                    </h2>
                    <p className="text-white/70 text-sm leading-relaxed max-w-[340px] mb-8">
                        Conecte nutricionistas e pacientes de forma simples, visual e eficiente. Feedback em tempo real, direto na refeição.
                    </p>

                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3 text-white/85 text-sm">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                                <Camera size={18} className="text-white/90" />
                            </div>
                            Registro de refeições com foto
                        </div>
                        <div className="flex items-center gap-3 text-white/85 text-sm">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                                <MessageSquare size={18} className="text-white/90" />
                            </div>
                            Feedback com texto e emojis
                        </div>
                        <div className="flex items-center gap-3 text-white/85 text-sm">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                                <BarChart2 size={18} className="text-white/90" />
                            </div>
                            Relatórios de progresso
                        </div>
                        <div className="flex items-center gap-3 text-white/85 text-sm">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                                <Bell size={18} className="text-white/90" />
                            </div>
                            Notificações em tempo real
                        </div>
                    </div>
                </div>

                <div className="relative z-10 text-xs text-white/40 mt-8">
                    © {new Date().getFullYear()} NutriTrack · Todos os direitos reservados
                </div>
            </div>

            {/* PAINEL DIREITO */}
            <div className="w-full md:w-1/2 flex items-center justify-center p-8 lg:p-12 overflow-y-auto">
                <div className="w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* STEP 1: Seleção de Papel */}
                    {step === 'role' && (
                        <div>
                            <h1 className="font-serif text-4xl font-semibold mb-1">Bem-vindo 👋</h1>
                            <p className="text-brand-muted text-sm mb-8">Como você vai usar o NutriTrack?</p>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div
                                    onClick={() => setRole('nutricionista')}
                                    className={`border-2 rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${role === 'nutricionista' ? 'border-brand-wine bg-brand-wine-pale' : 'border-brand-border bg-white hover:border-brand-wine-light hover:-translate-y-1 hover:shadow-custom'}`}
                                >
                                    <div className="text-4xl mb-3">👩‍⚕️</div>
                                    <div className="font-semibold text-sm mb-1">Nutricionista</div>
                                    <div className="text-[0.7rem] text-brand-muted leading-relaxed">Acompanhe e dê feedback às refeições dos seus pacientes</div>
                                </div>

                                <div
                                    onClick={() => setRole('cliente')}
                                    className={`border-2 rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${role === 'cliente' ? 'border-brand-wine bg-brand-wine-pale' : 'border-brand-border bg-white hover:border-brand-wine-light hover:-translate-y-1 hover:shadow-custom'}`}
                                >
                                    <div className="text-4xl mb-3">🧑</div>
                                    <div className="font-semibold text-sm mb-1">Paciente</div>
                                    <div className="text-[0.7rem] text-brand-muted leading-relaxed">Registre suas refeições e receba orientação profissional</div>
                                </div>
                            </div>

                            <button
                                disabled={!role}
                                onClick={() => { setStep('form'); setAuthTab('register'); }}
                                className="w-full py-3.5 bg-brand-wine text-white rounded-xl font-semibold text-sm transition-all hover:bg-[#7A1212] hover:shadow-lg disabled:bg-brand-border disabled:text-brand-muted disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                            >
                                Continuar →
                            </button>

                            <div className="flex items-center gap-4 my-6 text-brand-muted text-xs">
                                <hr className="flex-1 border-brand-border" />
                                já tem conta?
                                <hr className="flex-1 border-brand-border" />
                            </div>

                            <div className="text-center text-sm text-brand-muted">
                                <button onClick={() => { setStep('form'); setAuthTab('login'); }} className="text-brand-wine font-semibold hover:underline">
                                    Entrar agora
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Formulários (Login / Registro) */}
                    {step === 'form' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <button onClick={() => setStep('role')} className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-wine transition-colors mb-6">
                                <ArrowLeft size={14} /> Voltar
                            </button>

                            <div className="mb-6">
                                <h2 className="font-serif text-4xl font-semibold mb-1">Bem-vindo</h2>
                                <p className="text-sm text-brand-muted">Acesse ou crie sua conta</p>
                            </div>

                            {role && authTab === 'register' && (
                                <div className="inline-flex items-center gap-2 bg-brand-wine-pale text-brand-wine px-3 py-1.5 rounded-full text-xs font-semibold mb-6">
                                    {role === 'nutricionista' ? '👩‍⚕️ Perfil Profissional' : '👤 Perfil Paciente'}
                                </div>
                            )}

                            <div className="flex bg-brand-warm-white rounded-xl p-1 gap-1 mb-6">
                                <button
                                    onClick={() => { setAuthTab('login'); setErrorMsg(''); }}
                                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${authTab === 'login' ? 'bg-white text-brand-charcoal shadow-sm' : 'text-brand-muted hover:text-brand-charcoal'}`}
                                >
                                    Entrar
                                </button>
                                <button
                                    onClick={() => {
                                        setAuthTab('register');
                                        setErrorMsg('');
                                        if (!role) setRole('cliente');
                                    }}
                                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${authTab === 'register' ? 'bg-white text-brand-charcoal shadow-sm' : 'text-brand-muted hover:text-brand-charcoal'}`}
                                >
                                    Criar conta
                                </button>
                            </div>

                            {errorMsg && (
                                <div className="text-brand-danger bg-[#FDF1F1] border border-[#F1C9C9] p-3 rounded-xl text-xs font-medium mb-4">
                                    {errorMsg}
                                </div>
                            )}

                            {/* TABS ABAIXO */}
                            <form onSubmit={authTab === 'login' ? handleLogin : handleRegister}>

                                {/* LOGIN */}
                                {authTab === 'login' && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-semibold mb-1.5 tracking-wide">E-mail</label>
                                            <input
                                                type="email"
                                                required
                                                value={email} onChange={e => setEmail(e.target.value)}
                                                className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl text-sm focus:outline-none focus:border-brand-wine focus:ring-4 focus:ring-brand-wine/10 transition-all"
                                                placeholder="seu@email.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold mb-1.5 tracking-wide">Senha</label>
                                            <div className="relative">
                                                <input
                                                    type={showPwd ? "text" : "password"}
                                                    required
                                                    value={senha} onChange={e => setSenha(e.target.value)}
                                                    className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl text-sm focus:outline-none focus:border-brand-wine focus:ring-4 focus:ring-brand-wine/10 transition-all"
                                                    placeholder="••••••••"
                                                />
                                                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-charcoal">
                                                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <button type="button" onClick={() => setStep('forgot')} className="text-xs text-brand-wine font-medium hover:underline">
                                                Esqueci minha senha
                                            </button>
                                        </div>
                                        <button type="submit" disabled={loading} className="w-full py-3.5 mt-2 bg-brand-wine text-white rounded-xl font-semibold text-sm hover:bg-[#7A1212] hover:shadow-lg transition-all flex justify-center items-center gap-2 disabled:opacity-70">
                                            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Entrar na conta'}
                                        </button>
                                    </div>
                                )}

                                {/* REGISTER */}
                                {authTab === 'register' && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-semibold mb-1.5">Nome</label>
                                                <input required type="text" value={nome} onChange={e => setNome(e.target.value)} className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl text-sm focus:outline-none focus:border-brand-wine focus:ring-4 focus:ring-brand-wine/10" placeholder="Maria" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold mb-1.5">Sobrenome</label>
                                                <input required type="text" value={sobrenome} onChange={e => setSobrenome(e.target.value)} className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl text-sm focus:outline-none focus:border-brand-wine focus:ring-4 focus:ring-brand-wine/10" placeholder="Silva" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold mb-1.5">E-mail {role === 'nutricionista' && 'profissional'}</label>
                                            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl text-sm focus:outline-none focus:border-brand-wine focus:ring-4 focus:ring-brand-wine/10" placeholder={role === 'nutricionista' ? "dra@clinica.com" : "seu@email.com"} />
                                        </div>

                                        {role === 'nutricionista' && (
                                            <>
                                                <div>
                                                    <label className="block text-xs font-semibold mb-1.5">CRN</label>
                                                    <input required type="text" value={crn} onChange={e => setCrn(e.target.value.toUpperCase())} className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl text-sm focus:outline-none focus:border-brand-wine focus:ring-4 focus:ring-brand-wine/10 uppercase" placeholder="CRN-3 12345" />
                                                    <p className="text-[0.65rem] text-brand-muted mt-1">Seu registro será verificado para segurança.</p>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold mb-1.5">Especialidade</label>
                                                    <select required value={especialidade} onChange={e => setEspecialidade(e.target.value)} className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl text-sm focus:outline-none focus:border-brand-wine focus:ring-4 focus:ring-brand-wine/10 appearance-none">
                                                        <option value="">Selecione...</option>
                                                        <option>Nutrição clínica</option>
                                                        <option>Nutrição esportiva</option>
                                                        <option>Nutrição funcional</option>
                                                        <option>Emagrecimento</option>
                                                        <option>Pediatria nutricional</option>
                                                    </select>
                                                </div>
                                            </>
                                        )}

                                        {role === 'cliente' && (
                                            <>
                                                <div>
                                                    <label className="block text-xs font-semibold mb-1.5">Telefone</label>
                                                    <input required type="tel" value={telefone} onChange={e => setTelefone(e.target.value)} className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl text-sm focus:outline-none focus:border-brand-wine focus:ring-4 focus:ring-brand-wine/10" placeholder="(11) 99999-9999" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold mb-1.5 flex items-center gap-1">Código da nutricionista <span className="text-brand-muted font-normal">(opcional)</span></label>
                                                    <input type="text" value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl text-sm focus:outline-none focus:border-brand-wine focus:ring-4 focus:ring-brand-wine/10 uppercase" placeholder="Ex: NUTRI-ABC123" />
                                                    <p className="text-[0.65rem] text-brand-muted mt-1">Insira para vincular a conta automaticamente.</p>
                                                </div>
                                            </>
                                        )}

                                        <div>
                                            <label className="block text-xs font-semibold mb-1.5">Senha</label>
                                            <div className="relative">
                                                <input minLength={8} required type={showPwd ? "text" : "password"} value={senha} onChange={e => setSenha(e.target.value)} className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl text-sm focus:outline-none focus:border-brand-wine focus:ring-4 focus:ring-brand-wine/10" placeholder="Mínimo 8 caracteres" />
                                                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-charcoal">
                                                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 my-4">
                                            <input type="checkbox" id="terms" checked={terms} onChange={e => setTerms(e.target.checked)} className="mt-1 w-4 h-4 accent-brand-wine cursor-pointer" />
                                            <label htmlFor="terms" className="text-xs text-brand-muted leading-relaxed cursor-pointer">
                                                Li e aceito os <a href="#" className="text-brand-wine hover:underline">Termos de Uso</a> e a <a href="#" className="text-brand-wine hover:underline">Política de Privacidade</a>
                                            </label>
                                        </div>

                                        <button type="submit" disabled={loading} className="w-full py-3.5 bg-brand-wine text-white rounded-xl font-semibold text-sm hover:bg-[#7A1212] hover:shadow-lg transition-all flex justify-center items-center gap-2 disabled:opacity-70">
                                            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (role === 'nutricionista' ? 'Criar conta profissional →' : 'Criar minha conta →')}
                                        </button>
                                    </div>
                                )}
                            </form>
                        </div>
                    )}

                    {/* STEP 3: Forgot Password */}
                    {step === 'forgot' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <button onClick={() => setStep('form')} className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-wine transition-colors mb-6">
                                <ArrowLeft size={14} /> Voltar para login
                            </button>
                            <div className="mb-6">
                                <h2 className="font-serif text-3xl font-semibold mb-1">Recuperar senha</h2>
                                <p className="text-sm text-brand-muted">Enviaremos um link para o seu e-mail</p>
                            </div>

                            {errorMsg && (
                                <div className="text-brand-danger bg-[#FDF1F1] border border-[#F1C9C9] p-3 rounded-xl text-xs font-medium mb-4">
                                    {errorMsg}
                                </div>
                            )}

                            <form onSubmit={handleForgot} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5">E-mail cadastrado</label>
                                    <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl text-sm focus:outline-none focus:border-brand-wine focus:ring-4 focus:ring-brand-wine/10" placeholder="seu@email.com" />
                                </div>
                                <button type="submit" disabled={loading} className="w-full py-3.5 mt-2 bg-brand-wine text-white rounded-xl font-semibold text-sm hover:bg-[#7A1212] hover:shadow-lg transition-all flex justify-center items-center gap-2 disabled:opacity-70">
                                    {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Enviar link de recuperação'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* STEP 4: Success Message */}
                    {step === 'success' && (
                        <div className="text-center py-8 animate-in zoom-in duration-500">
                            <div className="w-20 h-20 bg-brand-wine-pale rounded-full flex items-center justify-center mx-auto mb-6 text-brand-wine">
                                <CheckCircle size={40} />
                            </div>
                            <h2 className="font-serif text-3xl font-semibold mb-2 text-brand-charcoal">Deu certo!</h2>
                            <p className="text-sm text-brand-muted mb-8 leading-relaxed max-w-[280px] mx-auto">
                                Seu cadastro foi realizado com sucesso. Por favor, verifique seu e-mail para ativar sua conta.
                            </p>
                            <button onClick={() => { setStep('form'); setAuthTab('login'); }} className="w-full max-w-[240px] mx-auto py-3.5 bg-brand-wine text-white rounded-xl font-semibold text-sm hover:bg-[#7A1212] hover:shadow-lg transition-all">
                                Ir para o login →
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
