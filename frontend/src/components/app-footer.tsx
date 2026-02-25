import Link from "next/link";

interface AppFooterProps {
    maxWidth?: string;
}

export function AppFooter({ maxWidth = "max-w-5xl" }: AppFooterProps) {
    const year = new Date().getFullYear();
    return (
        <footer className="border-t py-6 mt-auto" style={{ borderColor: "#E8E6E0", background: "#FAF9F6" }}>
            <div className={`${maxWidth} mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4`}>
                <Link href="/" className="text-lg font-light tracking-tight" style={{ fontFamily: "var(--font-heading)", color: "#8A8880" }}>
                    Inv<span className="text-[#D4A017]/60">oq</span>
                </Link>
                <div className="flex items-center gap-4 text-xs" style={{ color: "#8A8880" }}>
                    <Link href="/pricing" className="hover:text-[#4A4A45] transition-colors">Pricing</Link>
                    <span>·</span>
                    <Link href="/login" className="hover:text-[#4A4A45] transition-colors">Sign in</Link>
                    <span>·</span>
                    <span>© {year} Invoq</span>
                </div>
            </div>
        </footer>
    );
}
