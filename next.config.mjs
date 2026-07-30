/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Permite que o next/image otimize e faça cache dos avatars servidos
    // pelo Supabase Storage (bucket público "avatars").
    remotePatterns: [
      {
        protocol: "https",
        hostname: "damubikhrskzrxcgxcoc.supabase.co",
        pathname: "/storage/v1/object/public/avatars/**",
      },
    ],
    // Avatars raramente mudam (o mesmo path é sobrescrito no upload).
    // Mantém a versão otimizada em cache por 24h antes de revalidar na origem.
    minimumCacheTTL: 60 * 60 * 24,
  },
}

export default nextConfig
