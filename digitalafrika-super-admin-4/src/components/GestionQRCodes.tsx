import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Download, 
  Printer, 
  Clock, 
  RefreshCw, 
  Check, 
  Sparkles,
  ArrowLeft,
  CalendarCheck,
  Info,
  Copy,
  Link
} from 'lucide-react';

export type QRCodeType = 'entrée' | 'sortie';

export interface GeneratedQRCode {
  type: QRCodeType;
  code: string;
  url: string;
  createdAt: Date;
  durationMinutes?: number;
  expiresAt: Date | null;
}

interface GestionQRCodesProps {
  onQrActiveChange?: (isActive: boolean) => void;
}

export default function GestionQRCodes({ onQrActiveChange }: GestionQRCodesProps) {
  const [type, setType] = useState<QRCodeType>('entrée');
  const [durationMinutes, setDurationMinutes] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [qrCodeData, setQrCodeData] = useState<GeneratedQRCode | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}${window.location.pathname}`;
    navigator.clipboard.writeText(link).then(() => {
      setLinkCopied(true);
      showToast('✅ Lien copié dans le presse-papier !');
      setTimeout(() => setLinkCopied(false), 2000);
    }).catch(() => {
      showToast('Erreur lors de la copie du lien');
    });
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    setTimeout(() => {
      const minutes = durationMinutes !== '' ? Number(durationMinutes) : undefined;
      const formattedType = type.toUpperCase();
      
      const secureToken = `${formattedType}_DF_${Math.random().toString(36).substring(2, 10).toUpperCase()}_${Math.floor(Date.now() / 1000)}`;
      
      // ✅ QR Code contient juste le token
      const customUrl = secureToken;

      setQrCodeData({
        type,
        code: secureToken,
        url: customUrl,
        createdAt: new Date(),
        durationMinutes: minutes,
        expiresAt: minutes ? new Date(Date.now() + minutes * 60000) : null
      });

      setIsGenerating(false);
      if (onQrActiveChange) {
        onQrActiveChange(true);
      }
      showToast(`QR Code d'émargement généré avec succès.`);
    }, 450);
  };

  const handleReset = () => {
    setQrCodeData(null);
    if (onQrActiveChange) {
      onQrActiveChange(false);
    }
  };

  const handleDownloadSVG = () => {
    if (!qrCodeData) return;
    const svgElement = document.getElementById('attendance-qr-svg');
    if (!svgElement) {
      showToast('Une erreur est survenue lors de l\'export.');
      return;
    }

    try {
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = svgUrl;
      downloadLink.download = `onetime_qrcode_${qrCodeData.type}.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(svgUrl);
      showToast('Fichier SVG téléchargé avec succès.');
    } catch {
      showToast('Erreur lors du traitement.');
    }
  };

  const handlePrint = () => {
    if (!qrCodeData) return;
    const svgElement = document.getElementById('attendance-qr-svg');
    if (!svgElement) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Veuillez autoriser les fenêtres pop-up.');
      return;
    }

    const validityMessage = qrCodeData.expiresAt 
      ? `Ce code expire à ${qrCodeData.expiresAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
      : 'Code d\'émargement permanent';

    printWindow.document.write(`
      <html>
        <head>
          <title>One Time - Pointage de Présence</title>
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              text-align: center; 
              padding: 65px 20px; 
              color: #1e293b; 
              background-color: #ffffff; 
            }
            .card { 
              max-width: 480px; 
              margin: 0 auto; 
              border: 1px solid #e2e8f0; 
              border-radius: 32px; 
              padding: 48px; 
              box-shadow: 0 4px 24px rgba(0,0,0,0.04);
            }
            .brand {
              font-size: 15px;
              font-weight: 850;
              text-transform: uppercase;
              letter-spacing: 0.15em;
              color: #1d4ed8;
              margin-bottom: 20px;
            }
            .title { 
              font-size: 26px; 
              font-weight: 850; 
              margin-bottom: 8px; 
              letter-spacing: -0.03em;
            }
            .subtitle { 
              font-size: 14px; 
              color: #64748b; 
              margin-bottom: 32px; 
            }
            .badge { 
              display: inline-block; 
              padding: 8px 18px; 
              font-weight: 700; 
              border-radius: 9999px; 
              font-size: 12px; 
              text-transform: uppercase; 
              letter-spacing: 0.05em;
              margin-bottom: 32px;
              background-color: ${qrCodeData.type === 'entrée' ? '#eff6ff' : '#fef2f2'}; 
              color: ${qrCodeData.type === 'entrée' ? '#1d4ed8' : '#dc2626'}; 
              border: 1px solid ${qrCodeData.type === 'entrée' ? '#bfdbfe' : '#fecdd3'}; 
            }
            .qr-holder { 
              display: inline-block; 
              padding: 24px; 
              background: #ffffff; 
              border: 1px solid #f1f5f9; 
              border-radius: 24px; 
              box-shadow: 0 10px 15px -3px rgba(0,0,0,0.02);
            }
            .help-text {
              margin-top: 32px;
              font-size: 12px;
              color: #94a3b8;
              font-weight: 500;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="brand">One Time</div>
            <div class="title">Pointage Présence</div>
            <div class="subtitle">Scannez pour valider votre émargement</div>
            <div class="badge">${qrCodeData.type === 'entrée' ? 'Prise de Poste (Entrée)' : 'Fin de Poste (Sortie)'}</div>
            <div>
              <div class="qr-holder">
                ${svgElement.outerHTML}
              </div>
            </div>
            <div class="help-text">${validityMessage}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 800);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (qrCodeData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="w-full flex flex-col items-center justify-center py-6 animate-scale-up" id="isolated-qr-view">
          
          {toastMessage && (
            <div className="fixed top-4 right-4 z-50 bg-slate-900 border border-slate-800 text-white text-xs py-3 px-4 rounded-xl shadow-xl flex items-center gap-2 font-medium animate-fade-in">
              <Check className="w-4 h-4 text-blue-500" />
              <span>{toastMessage}</span>
            </div>
          )}

          <div className="bg-white border border-slate-100 rounded-3xl p-8 md:p-14 shadow-lg max-w-lg w-full text-center space-y-8 flex flex-col items-center justify-center">
            
            <div className="space-y-2">
              <span className={`inline-flex items-center text-[10px] tracking-wider font-extrabold px-3.5 py-1 rounded-full uppercase border ${
                qrCodeData.type === 'entrée' 
                  ? 'bg-blue-50 text-blue-800 border-blue-200' 
                  : 'bg-rose-50 text-rose-700 border-rose-100'
              }`}>
                {qrCodeData.type === 'entrée' ? '● Enregistrement Entrée' : '● Enregistrement Sortie'}
              </span>
              <h2 className="text-xl font-extrabold text-slate-800 tracking-tight font-sans">
                Émargement par QR Code
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Ouvrez l'application mobile et scannez le code pour valider votre présence.
              </p>
            </div>

            <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-md inline-block">
              <QRCodeSVG
                id="attendance-qr-svg"
                value={qrCodeData.url}
                size={300}
                level="H"
                includeMargin={true}
                fgColor="#1e293b"
                bgColor="#ffffff"
              />
            </div>

            <div className="space-y-1 w-full">
              <p className="text-xs text-slate-500 font-sans font-semibold">
                {qrCodeData.expiresAt 
                  ? `Ce code temporaire est valide jusqu'à ${qrCodeData.expiresAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                  : 'Code d\'émargement permanent'}
              </p>
            </div>

            {/* ✅ BOUTON COPIER LE LIEN */}
            <button
              type="button"
              onClick={handleCopyLink}
              className={`w-full py-3 px-4 rounded-2xl text-xs font-semibold transition duration-150 inline-flex items-center justify-center gap-2 cursor-pointer ${
                linkCopied 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {linkCopied ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  Lien copié !
                </>
              ) : (
                <>
                  <Link className="w-4 h-4 text-slate-500" />
                  Copier le lien de la page
                </>
              )}
            </button>

            <div className="w-full space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="py-3 px-4 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-700 text-xs font-semibold rounded-2xl transition duration-150 inline-flex items-center justify-center gap-2 cursor-pointer border border-slate-200/50"
                >
                  <Printer className="w-4 h-4 text-slate-500" />
                  Imprimer
                </button>
                
                <button
                  type="button"
                  onClick={handleDownloadSVG}
                  className="py-3 px-4 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-700 text-xs font-semibold rounded-2xl transition duration-150 inline-flex items-center justify-center gap-2 cursor-pointer border border-slate-200/50"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  Télécharger SVG
                </button>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="w-full py-3 px-4 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white rounded-2xl text-xs font-semibold transition duration-150 inline-flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <ArrowLeft className="w-4 h-4" />
                Générer un autre pointage
              </button>
            </div>

          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-lg mx-auto bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden animate-fade-in" id="simplified-qr-container">
        
        {toastMessage && (
          <div className="fixed top-4 right-4 z-50 bg-slate-900 border border-slate-800 text-white text-xs py-3 px-4 rounded-xl shadow-xl flex items-center gap-2 font-medium animate-fade-in">
            <Check className="w-4 h-4 text-blue-500" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ✅ BOUTON COPIER LE LIEN DANS LE HEADER */}
        <div className="p-6 border-b border-blue-100 bg-blue-50/10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-700 text-white rounded-2xl shadow-sm">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider font-sans">
                  Émargement d'Équipe
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Sélectionnez l'action de pointage
                </p>
              </div>
            </div>
            {/* ✅ Bouton copier le lien */}
            <button
              type="button"
              onClick={handleCopyLink}
              className={`py-2 px-3 rounded-xl text-[10px] font-semibold transition duration-150 inline-flex items-center gap-1.5 cursor-pointer ${
                linkCopied 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
              }`}
            >
              {linkCopied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copié !
                </>
              ) : (
                <>
                  <Link className="w-3.5 h-3.5" />
                  Copier le lien
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          
          <form onSubmit={handleGenerate} className="space-y-6">
            
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider font-sans">
                Mode de pointage
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setType('entrée')}
                  className={`py-2.5 px-4 rounded-xl text-xs font-semibold transition duration-150 inline-flex items-center justify-center gap-2 cursor-pointer ${
                    type === 'entrée'
                      ? 'bg-white text-blue-700 shadow-sm border border-blue-200/20'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-700" />
                  Arrivée (Entrée)
                </button>

                <button
                  type="button"
                  onClick={() => setType('sortie')}
                  className={`py-2.5 px-4 rounded-xl text-xs font-semibold transition duration-150 inline-flex items-center justify-center gap-2 cursor-pointer ${
                    type === 'sortie'
                      ? 'bg-white text-blue-700 shadow-sm border border-blue-200/20'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Départ (Sortie)
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider font-sans flex items-center justify-between">
                <span>Durée de validité</span>
                <span className="text-[10px] text-slate-400 font-normal normal-case">Code permanent si laissé vide</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Clock className="w-4 h-4 text-slate-400" />
                </span>
                <input
                  type="number"
                  min="1"
                  placeholder="Ex. : 15, 30, 45 minutes..."
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-200 rounded-2xl pl-10 pr-4 py-3 focus:border-blue-500 focus:outline-none transition text-slate-800 placeholder-slate-400 bg-slate-50/50"
                  id="duration-input"
                />
              </div>
              
              <div className="flex gap-1.5 pt-1">
                {[15, 30, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDurationMinutes(String(mins))}
                    className="text-[10px] px-2.5 py-1 rounded bg-blue-50/50 hover:bg-blue-100 text-blue-700 border border-blue-200/30 font-medium transition cursor-pointer"
                  >
                    {mins} min
                  </button>
                ))}
                {durationMinutes && (
                  <button
                    type="button"
                    onClick={() => setDurationMinutes('')}
                    className="text-[10px] px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 font-medium transition cursor-pointer"
                  >
                    Permanent
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className={`w-full py-3.5 px-5 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white rounded-2xl text-xs font-extrabold transition duration-150 inline-flex items-center justify-center gap-2 shadow-md cursor-pointer ${
                isGenerating ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-blue-300" />
                  Générer le Code d'Émargement
                </>
              )}
            </button>
          </form>

          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] leading-relaxed text-slate-500 items-center gap-2 flex">
            <Info className="w-4 h-4 text-blue-700 shrink-0" />
            <span>
              Le QR Code généré sera instantanément utilisable sur l'application mobile de pointage de votre équipe.
            </span>
          </div>

        </div>

      </div>
    </div>
  );
}