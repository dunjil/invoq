import Link from "next/link";
import { FileText, FileSignature, Shield } from "lucide-react";
import { OnboardingWizard } from "@/components/features/onboarding-wizard";

export function DashboardHeaderActions() {
    return (
        <div className="flex items-center gap-4">
            <OnboardingWizard />
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-[#E8E6E0] w-fit">
                <Link href="/create?type=quote" className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#4A4A45] hover:text-[#1A1A18] hover:bg-[#F5F3EE] rounded-lg transition-colors">
                    <FileText className="h-4 w-4 text-[#8A8880]" /> Quote
                </Link>
                <div className="w-[1px] bg-[#E8E6E0] my-2 mx-1 hidden sm:block"></div>
                <Link href="/create" className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#4A4A45] hover:text-[#1A1A18] hover:bg-[#F5F3EE] rounded-lg transition-colors">
                    <FileText className="h-4 w-4 text-[#D4A017]" /> Invoice
                </Link>
                <div className="w-[1px] bg-[#E8E6E0] my-2 mx-1 hidden sm:block"></div>
                <Link href="/create/contract" className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#4A4A45] hover:text-[#1A1A18] hover:bg-[#F5F3EE] rounded-lg transition-colors">
                    <FileSignature className="h-4 w-4 text-[#4A7C59]" /> Contract
                </Link>
                <div className="w-[1px] bg-[#E8E6E0] my-2 mx-1 hidden sm:block"></div>
                <Link href="/create/contract?type=nda" className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#4A4A45] hover:text-[#1A1A18] hover:bg-[#F5F3EE] rounded-lg transition-colors">
                    <Shield className="h-4 w-4 text-[#C0392B]" /> NDA
                </Link>
            </div>
        </div>
    );
}
