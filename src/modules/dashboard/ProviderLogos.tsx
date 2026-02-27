/**
 * AI Provider logo components (inline SVG)
 * Used on the Dashboard to show supported providers
 */

interface LogoProps {
    size?: number;
    className?: string;
}

export function OpenAILogo({ size = 32, className }: LogoProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width={size}
            height={size}
            className={className}
            fill="currentColor"
        >
            <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.998 5.998 0 0 0-3.998 2.9 6.05 6.05 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
        </svg>
    );
}

export function GeminiLogo({ size = 32, className }: LogoProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width={size}
            height={size}
            className={className}
            fill="none"
        >
            <path
                d="M12 24A14.304 14.304 0 0 0 12 0a14.304 14.304 0 0 0 0 24z"
                fill="url(#gemini-gradient)"
            />
            <defs>
                <linearGradient id="gemini-gradient" x1="0" y1="0" x2="24" y2="24">
                    <stop stopColor="#4285F4" />
                    <stop offset="0.5" stopColor="#9B72CB" />
                    <stop offset="1" stopColor="#D96570" />
                </linearGradient>
            </defs>
        </svg>
    );
}

export function ClaudeLogo({ size = 32, className }: LogoProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width={size}
            height={size}
            className={className}
            fill="currentColor"
        >
            <path d="M4.709 15.955l4.397-2.196a.27.27 0 0 1 .37.107l.591 1.107a.27.27 0 0 1-.106.37l-4.397 2.197a.27.27 0 0 1-.37-.107l-.591-1.108a.27.27 0 0 1 .106-.37zM8.83 7.879l.591 1.108a.27.27 0 0 1-.107.37l-4.396 2.196a.27.27 0 0 1-.37-.107L3.957 10.34a.27.27 0 0 1 .107-.37L8.46 7.773a.27.27 0 0 1 .37.106zM14.244 3.262l.678 3.156a.27.27 0 0 1-.212.32l-1.189.255a.27.27 0 0 1-.319-.212L12.524 3.625a.27.27 0 0 1 .212-.319l1.189-.256a.27.27 0 0 1 .319.212zM17.344 8.033l-2.636 3.736a.27.27 0 0 1-.375.067l-.99-.697a.27.27 0 0 1-.067-.375l2.636-3.736a.27.27 0 0 1 .375-.067l.99.697a.27.27 0 0 1 .067.375zM19.377 15.476l-3.156.678a.27.27 0 0 1-.32-.212l-.255-1.189a.27.27 0 0 1 .212-.319l3.156-.678a.27.27 0 0 1 .319.212l.256 1.189a.27.27 0 0 1-.212.32zM14.803 19.225l-.678-3.157a.27.27 0 0 1 .212-.319l1.189-.256a.27.27 0 0 1 .319.213l.678 3.156a.27.27 0 0 1-.212.32l-1.189.255a.27.27 0 0 1-.319-.212z" />
        </svg>
    );
}

export function VertexLogo({ size = 32, className }: LogoProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width={size}
            height={size}
            className={className}
            fill="none"
        >
            <path d="M12 2L2 19.5h6l4-8 4 8h6L12 2z" fill="url(#vertex-gradient)" />
            <defs>
                <linearGradient id="vertex-gradient" x1="2" y1="2" x2="22" y2="19.5">
                    <stop stopColor="#4285F4" />
                    <stop offset="1" stopColor="#34A853" />
                </linearGradient>
            </defs>
        </svg>
    );
}
