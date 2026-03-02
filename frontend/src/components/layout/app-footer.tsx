import Link from "next/link";
import Image from "next/image";

interface AppFooterProps {
    maxWidth?: string;
}

export function AppFooter({ maxWidth = "max-w-7xl" }: AppFooterProps) {
    const year = new Date().getFullYear();
    return (
        <footer className="bg-white border-t mt-auto text-[#8A8880] py-12 sm:py-16 text-sm">
            <div className={`${maxWidth} mx-auto px-5 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4`}>
                <div className="md:col-span-1">
                    <Link href="/">
                        <div className="relative h-6 w-24 mb-3 opacity-80">
                            <Image
                                src="/images/invoq-logo-transparent.png"
                                alt="INVOQ"
                                fill
                                className="object-contain object-left"
                            />
                        </div>
                    </Link>
                </div>
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
