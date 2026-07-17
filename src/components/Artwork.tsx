import { useEffect, useState } from 'react';
import { ImageOff, Sparkles } from 'lucide-react';

type ArtworkProps = {
    src?: string;
    fallbackSrc?: string;
    alt: string;
    className?: string;
    imageClassName?: string;
};

export function Artwork({ src, fallbackSrc, alt, className = '', imageClassName = '' }: ArtworkProps) {
    const sources = [src, fallbackSrc].filter((value, index, values): value is string =>
        Boolean(value) && values.indexOf(value) === index
    );
    const [sourceIndex, setSourceIndex] = useState(0);

    useEffect(() => setSourceIndex(0), [src, fallbackSrc]);

    if (sources[sourceIndex]) {
        return (
            <img
                src={sources[sourceIndex]}
                alt={alt}
                className={`${className} ${imageClassName}`}
                onError={() => setSourceIndex(index => index + 1)}
            />
        );
    }

    return (
        <div
            role="img"
            aria-label={`${alt} placeholder`}
            className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-950 ${className}`}
        >
            <Sparkles className="absolute right-2 top-2 text-violet-400/40" size={18} />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.2),transparent_65%)]" />
            <ImageOff className="relative text-indigo-300/70" size={28} strokeWidth={1.5} />
        </div>
    );
}
