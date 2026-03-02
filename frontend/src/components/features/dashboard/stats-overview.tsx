import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, CreditCard, ShieldCheck, Landmark } from "lucide-react";

interface StatsOverviewProps {
    summary: {
        outstanding_invoices_total: number;
        confirmed_cash_flow_month: number;
        trust_score?: number;
        tax_position: {
            estimated_tax: number;
        };
    };
}

export function StatsOverview({ summary }: StatsOverviewProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Outstanding Invoices Panel */}
            <Card className="shadow-sm border-[#E8E6E0] bg-white rounded-xl overflow-hidden group">
                <div className="h-1 bg-[#D4A017] opacity-20 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold text-[#8A8880] uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp className="h-3.5 w-3.5" /> Portolio Revenue
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-serif text-[#1A1A18] mb-1">{formatCurrency(summary.outstanding_invoices_total || 0)}</div>
                    <p className="text-[10px] text-[#8A8880] uppercase tracking-wider font-bold">Outstanding in 4 relationships</p>
                </CardContent>
            </Card>

            {/* Monthly Cash Flow Panel */}
            <Card className="shadow-sm border-[#E8E6E0] bg-white rounded-xl overflow-hidden group">
                <div className="h-1 bg-[#4A7C59] opacity-20 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold text-[#8A8880] uppercase tracking-widest flex items-center gap-2">
                        <CreditCard className="h-3.5 w-3.5" /> Cash Flow
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-serif text-[#4A7C59] mb-1">{formatCurrency(summary.confirmed_cash_flow_month || 0)}</div>
                    <p className="text-[10px] text-[#8A8880] uppercase tracking-wider font-bold">Confirmed this month</p>
                </CardContent>
            </Card>

            {/* Trust Badge Panel */}
            <Link href="/trust">
                <Card className="shadow-sm border-[#E8E6E0] bg-white rounded-xl overflow-hidden h-full hover:border-[#D4A017] transition-all cursor-pointer group">
                    <div className="h-1 bg-[#D4A017] opacity-10 group-hover:opacity-100 transition-opacity" />
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-[#8A8880] uppercase tracking-widest flex items-center gap-2">
                            <ShieldCheck className="h-3.5 w-3.5" /> Relationship Trust
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-serif text-[#D4A017] mb-1">{summary.trust_score || 98.5}%</div>
                        <p className="text-[10px] text-[#8A8880] uppercase tracking-wider font-bold">High Trust Tier</p>
                    </CardContent>
                </Card>
            </Link>

            {/* Tax Position Panel */}
            <Link href="/tax">
                <Card className="shadow-sm border-[#E8E6E0] bg-white rounded-xl overflow-hidden h-full hover:border-[#C0392B] transition-all cursor-pointer group">
                    <div className="h-1 bg-[#C0392B] opacity-10 group-hover:opacity-100 transition-opacity" />
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-[#8A8880] uppercase tracking-widest flex items-center gap-2">
                            <Landmark className="h-3.5 w-3.5" /> Tax Provision
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-serif text-[#C0392B] mb-1">{formatCurrency(summary?.tax_position?.estimated_tax || 0)}</div>
                        <p className="text-[10px] text-[#8A8880] uppercase tracking-wider font-bold">Est. Owed for 2026</p>
                    </CardContent>
                </Card>
            </Link>
        </div>
    );
}
