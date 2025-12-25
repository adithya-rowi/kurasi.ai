import { Shield } from "lucide-react";

export function CouncilFooter() {
  return (
    <div className="bg-slate-900 rounded-xl p-6 text-white mt-8" data-testid="council-footer">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold mb-1">Komitmen Transparansi Kurasi.ai</h3>
          <p className="text-slate-300 text-sm leading-relaxed">
            Brief ini dikurasi oleh Dewan AI yang bekerja independen. 
            Setiap berita dapat diverifikasi ke sumber aslinya. 
            Kami tidak mengedit atau mengubah fakta dari sumber.
          </p>
          
          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-xs text-slate-400 mb-2">MODEL AI YANG DIGUNAKAN:</p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs bg-slate-800 px-2 py-1 rounded">Claude (Anthropic)</span>
              <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">+ model lainnya saat diaktifkan</span>
            </div>
          </div>
          
          <div className="mt-3">
            <p className="text-xs text-slate-400">
              ⚠️ AI dapat membuat kesalahan. Selalu verifikasi informasi penting sebelum mengambil keputusan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
