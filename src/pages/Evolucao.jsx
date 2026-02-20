import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Activity, ArrowUpRight, ArrowDownRight, Scale, TrendingUp, Target } from 'lucide-react';
import { useAuth } from '../context/AuthContextObj';

const EVOLUCAO_DATA = [
    { name: 'Jan', peso: 78.5, gordura: 22.1 },
    { name: 'Fev', peso: 77.2, gordura: 21.5 },
    { name: 'Mar', peso: 76.8, gordura: 21.0 },
    { name: 'Abr', peso: 75.1, gordura: 20.2 },
    { name: 'Mai', peso: 74.3, gordura: 19.5 },
    { name: 'Jun', peso: 73.0, gordura: 18.8 },
];

export default function Evolucao() {
    const { role } = useAuth();
    const isNutri = role === 'nutricionista';

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 h-full overflow-y-auto pb-24 md:pb-8">
            <div className="mb-8">
                <h1 className="font-serif text-3xl font-semibold text-brand-wine">
                    {isNutri ? 'Evolução do Paciente' : 'Minha Evolução'}
                </h1>
                <p className="text-brand-muted mt-1">Acompanhamento de medidas e progresso corporal.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-2xl p-5 shadow-custom border border-brand-border/40">
                    <div className="flex items-center gap-3 text-brand-charcoal mb-3">
                        <div className="w-10 h-10 rounded-full bg-brand-wine-pale text-brand-wine flex items-center justify-center">
                            <Scale size={20} />
                        </div>
                        <h3 className="font-semibold text-sm">Peso Atual</h3>
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold">73.0 <span className="text-sm text-brand-muted font-normal">kg</span></span>
                    </div>
                    <div className="text-xs text-green-600 font-semibold mt-2 flex items-center gap-1">
                        <ArrowDownRight size={14} /> -1.3kg desde a última consulta
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-custom border border-brand-border/40">
                    <div className="flex items-center gap-3 text-brand-charcoal mb-3">
                        <div className="w-10 h-10 rounded-full bg-brand-warm-white text-[#B81A1F] flex items-center justify-center">
                            <Activity size={20} />
                        </div>
                        <h3 className="font-semibold text-sm">% Gordura</h3>
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold">18.8 <span className="text-sm text-brand-muted font-normal">%</span></span>
                    </div>
                    <div className="text-xs text-green-600 font-semibold mt-2 flex items-center gap-1">
                        <ArrowDownRight size={14} /> -0.7% desde a última consulta
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-custom border border-brand-border/40">
                    <div className="flex items-center gap-3 text-brand-charcoal mb-3">
                        <div className="w-10 h-10 rounded-full bg-brand-warm-white text-[#7A1D1D] flex items-center justify-center">
                            <TrendingUp size={20} />
                        </div>
                        <h3 className="font-semibold text-sm">Massa Magra</h3>
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold">58.4 <span className="text-sm text-brand-muted font-normal">kg</span></span>
                    </div>
                    <div className="text-xs text-green-600 font-semibold mt-2 flex items-center gap-1">
                        <ArrowUpRight size={14} /> +0.2kg desde a última consulta
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-custom border border-brand-border/40">
                    <div className="flex items-center gap-3 text-brand-charcoal mb-3">
                        <div className="w-10 h-10 rounded-full bg-brand-wine/10 text-brand-wine flex items-center justify-center">
                            <Target size={20} />
                        </div>
                        <h3 className="font-semibold text-sm">Meta de Peso</h3>
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold">70.0 <span className="text-sm text-brand-muted font-normal">kg</span></span>
                    </div>
                    <div className="text-xs text-brand-muted font-medium mt-2 flex items-center gap-1">
                        Faltam 3.0 kg
                    </div>
                </div>
            </div>

            {/* Grafico Peso */}
            <div className="bg-white rounded-3xl p-6 shadow-custom border border-brand-border/40 mb-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="font-serif font-semibold text-lg text-brand-charcoal">Curva de Peso</h3>
                        <p className="text-xs text-brand-muted">Últimos 6 meses</p>
                    </div>
                    <select className="bg-brand-warm-white border-0 text-xs font-semibold rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-brand-wine/20 text-brand-charcoal">
                        <option>Últimos 6 meses</option>
                        <option>Este Ano</option>
                        <option>Todo Período</option>
                    </select>
                </div>

                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={EVOLUCAO_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorPeso" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#B81A1F" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#B81A1F" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7D4D1" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8D6C6C' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8D6C6C' }} />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                                itemStyle={{ color: '#2B1515', fontWeight: 'bold' }}
                            />
                            <Area type="monotone" dataKey="peso" stroke="#B81A1F" strokeWidth={3} fillOpacity={1} fill="url(#colorPeso)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Tabela de Medidas Antigas */}
            <div className="bg-white rounded-3xl p-6 shadow-custom border border-brand-border/40">
                <h3 className="font-serif font-semibold text-lg text-brand-charcoal mb-4">Histórico de Medidas</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-brand-muted uppercase bg-brand-warm-white/50 rounded-lg">
                            <tr>
                                <th className="px-4 py-3 font-semibold rounded-l-lg">Data</th>
                                <th className="px-4 py-3 font-semibold">Peso (kg)</th>
                                <th className="px-4 py-3 font-semibold">% Gordura</th>
                                <th className="px-4 py-3 font-semibold">M. Magra (kg)</th>
                                <th className="px-4 py-3 font-semibold rounded-r-lg">Observação</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-brand-border/50">
                                <td className="px-4 py-3 font-medium text-brand-charcoal">15 Jun, 2025</td>
                                <td className="px-4 py-3 text-brand-charcoal">73.0 <span className="text-green-500 text-[0.65rem] font-bold">(-1.3)</span></td>
                                <td className="px-4 py-3 text-brand-charcoal">18.8 <span className="text-green-500 text-[0.65rem] font-bold">(-0.7)</span></td>
                                <td className="px-4 py-3 text-brand-charcoal">58.4 <span className="text-green-500 text-[0.65rem] font-bold">(+0.2)</span></td>
                                <td className="px-4 py-3 text-brand-muted">Excelente adesão ao plano.</td>
                            </tr>
                            <tr className="border-b border-brand-border/50">
                                <td className="px-4 py-3 font-medium text-brand-charcoal">10 Mai, 2025</td>
                                <td className="px-4 py-3 text-brand-charcoal">74.3 <span className="text-green-500 text-[0.65rem] font-bold">(-0.8)</span></td>
                                <td className="px-4 py-3 text-brand-charcoal">19.5 <span className="text-green-500 text-[0.65rem] font-bold">(-0.7)</span></td>
                                <td className="px-4 py-3 text-brand-charcoal">58.2 <span className="text-red-500 text-[0.65rem] font-bold">(-0.1)</span></td>
                                <td className="px-4 py-3 text-brand-muted">Foco maior em proteínas agora.</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-3 font-medium text-brand-charcoal">12 Abr, 2025</td>
                                <td className="px-4 py-3 text-brand-charcoal">75.1</td>
                                <td className="px-4 py-3 text-brand-charcoal">20.2</td>
                                <td className="px-4 py-3 text-brand-charcoal">58.3</td>
                                <td className="px-4 py-3 text-brand-muted">Início do plano atual.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
