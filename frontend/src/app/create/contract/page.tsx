import { CreateContract } from "@/components/features/create-contract";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default function ContractCreatePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#D4A017]" />
            </div>
        }>
            <CreateContract defaultType="contract" />
        </Suspense>
    );
}
