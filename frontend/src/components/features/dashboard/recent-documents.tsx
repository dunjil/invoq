import Link from "next/link";
import { FileText } from "lucide-react";

interface RecentDocumentsProps {
    documents: any[];
}

export function RecentDocuments({ documents }: RecentDocumentsProps) {
    const [mounted, setMounted] = (require('react')).useState(false);
    (require('react')).useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#1A1A18] uppercase tracking-[0.2em]">Recent Documents</h3>
                <Link href="/history" className="text-[10px] font-bold text-[#D4A017] hover:underline uppercase tracking-widest">View All</Link>
            </div>
            <div className="space-y-2">
                {documents && documents.length > 0 ? documents.map((doc: any) => (
                    <Link key={doc.id} href={doc.type.toLowerCase() === 'invoice' ? `/view/invoice/${doc.token}` : `/view/contract/${doc.token}`}>
                        <div className="bg-white p-4 rounded-xl border border-[#E8E6E0] flex items-center justify-between hover:border-[#D4A017]/40 transition-all shadow-sm group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-[#FAF9F6] rounded-lg flex items-center justify-center border border-[#E8E6E0]">
                                    <FileText className="h-5 w-5 text-[#8A8880]" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-[#1A1A18] group-hover:text-[#D4A017] transition-colors">{doc.document_number}</p>
                                    <p className="text-[10px] text-[#8A8880] uppercase tracking-widest font-bold">{doc.to_name || "Draft Recipient"} • {doc.type}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-bold tracking-widest uppercase ${doc.status === 'signed' || doc.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                    {doc.status}
                                </span>
                                <p className="text-[9px] text-[#8A8880] mt-1 font-mono">
                                    {mounted ? new Date(doc.created_at).toLocaleDateString() : "..."}
                                </p>
                            </div>
                        </div>
                    </Link>
                )) : (

                    <div className="bg-white p-12 rounded-xl border border-dashed border-[#E8E6E0] text-center">
                        <p className="text-xs text-[#8A8880]">No recent documents found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
