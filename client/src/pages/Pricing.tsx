import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { subscriptionApi } from "@/lib/api";
import { session } from "@/lib/session";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ArrowLeft, Crown, Mail, Zap, Archive, Shield } from "lucide-react";

export default function Pricing() {
  const [_, setLocation] = useLocation();
  const userId = session.getUserId();
  const queryClient = useQueryClient();

  const { data: plans = [] } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: () => subscriptionApi.getPlans(),
  });

  const { data: subscription } = useQuery({
    queryKey: ["subscription", userId],
    queryFn: () => (userId ? subscriptionApi.getStatus(userId) : null),
    enabled: !!userId,
  });

  const activateMutation = useMutation({
    mutationFn: (planName: string) => {
      if (!userId) throw new Error("Belum login");
      return subscriptionApi.activate(userId, planName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription", userId] });
      toast.success("Selamat datang di Premium! Pengiriman email sekarang tersedia.");
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal mengaktifkan langganan");
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2 text-white hover:text-amber-400 hover:bg-white/10" data-testid="link-back">
              <ArrowLeft className="h-4 w-4" /> Kembali
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">L</span>
            </div>
            <span className="font-bold text-lg text-white">Loper</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif font-bold mb-4 text-white" data-testid="text-pricing-title">
            Pilih Paket Anda
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            Terima brief intelijen personal di inbox Anda setiap pagi. 
            Seperti memiliki analis riset pribadi, tapi didukung oleh AI.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="border border-white/10 rounded-xl p-6 bg-white/5 backdrop-blur" data-testid="card-plan-free">
            <h3 className="text-xl font-bold mb-2 text-white">Gratis</h3>
            <div className="text-3xl font-bold mb-4 text-white">
              Rp 0<span className="text-sm font-normal text-white/60">/bulan</span>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-sm text-white/80">
                <Check className="h-4 w-4 text-emerald-400" /> Lihat brief di aplikasi
              </li>
              <li className="flex items-center gap-2 text-sm text-white/80">
                <Check className="h-4 w-4 text-emerald-400" /> 1 brief per hari
              </li>
              <li className="flex items-center gap-2 text-sm text-white/80">
                <Check className="h-4 w-4 text-emerald-400" /> Simpan artikel
              </li>
              <li className="flex items-center gap-2 text-sm text-white/80">
                <Check className="h-4 w-4 text-emerald-400" /> Arsip 7 hari
              </li>
            </ul>
            {!subscription?.isPremium ? (
              <div className="w-full py-2 text-center text-white/70 border border-white/20 rounded-md text-sm font-medium">
                Paket Saat Ini
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10"
                data-testid="button-select-free"
              >
                Turunkan Paket
              </Button>
            )}
          </div>

          <div
            className="border-2 border-amber-500 rounded-xl p-6 bg-white relative shadow-xl shadow-amber-500/20"
            data-testid="card-plan-premium"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <Crown className="h-3 w-3" /> Paling Populer
            </div>
            <h3 className="text-xl font-bold mb-2 text-slate-800">Premium</h3>
            <div className="text-3xl font-bold mb-4 text-slate-900">
              Rp 79.000<span className="text-sm font-normal text-slate-500">/bulan</span>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <Check className="h-4 w-4 text-emerald-500" /> Semua fitur Gratis
              </li>
              <li className="flex items-center gap-2 text-sm font-medium text-amber-600">
                <Mail className="h-4 w-4" /> Pengiriman ke email
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <Zap className="h-4 w-4 text-amber-500" /> Notifikasi berita urgent
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <Archive className="h-4 w-4 text-slate-400" /> Arsip 90 hari
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <Shield className="h-4 w-4 text-slate-400" /> Dukungan prioritas
              </li>
            </ul>
            <Button
              className="w-full bg-amber-500 hover:bg-amber-600 text-white"
              disabled={subscription?.isPremium || activateMutation.isPending}
              onClick={() => activateMutation.mutate("premium")}
              data-testid="button-select-premium"
            >
              {subscription?.isPremium ? "Paket Saat Ini" : activateMutation.isPending ? "Memproses..." : "Berlangganan Sekarang"}
            </Button>
            <p className="text-xs text-slate-500 text-center mt-3">
              Mode demo - pembayaran tidak diperlukan
            </p>
          </div>

          <div className="border border-white/10 rounded-xl p-6 bg-white/5 backdrop-blur" data-testid="card-plan-enterprise">
            <h3 className="text-xl font-bold mb-2 text-white">Enterprise</h3>
            <div className="text-3xl font-bold mb-4 text-white">
              Custom<span className="text-sm font-normal text-white/60"> harga</span>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-sm text-white/80">
                <Check className="h-4 w-4 text-emerald-400" /> Semua fitur Premium
              </li>
              <li className="flex items-center gap-2 text-sm text-white/80">
                <Check className="h-4 w-4 text-emerald-400" /> Multi pengguna
              </li>
              <li className="flex items-center gap-2 text-sm text-white/80">
                <Check className="h-4 w-4 text-emerald-400" /> Sumber berita khusus
              </li>
              <li className="flex items-center gap-2 text-sm text-white/80">
                <Check className="h-4 w-4 text-emerald-400" /> Akses API
              </li>
              <li className="flex items-center gap-2 text-sm text-white/80">
                <Check className="h-4 w-4 text-emerald-400" /> Arsip 365 hari
              </li>
            </ul>
            <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10" data-testid="button-contact-sales">
              Hubungi Sales
            </Button>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-8 text-center">
          <h3 className="font-serif font-bold text-xl mb-3 text-white">
            Mengapa eksekutif memilih Loper Premium
          </h3>
          <p className="text-white/70 max-w-2xl mx-auto">
            Bayangkan bangun pagi dan langsung menerima brief intelijen personal di inbox Anda, 
            dikurasi oleh 5 AI yang memahami peran Anda, industri Anda, dan kebutuhan pengambilan 
            keputusan Anda. Tidak perlu lagi scroll berita yang tidak relevan - hanya intelijen 
            yang penting untuk Anda.
          </p>
        </div>
      </main>
    </div>
  );
}
