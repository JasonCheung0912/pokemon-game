import { SHOP_ITEMS, EXP_TO_MONEY } from '@/game/config';

export function ShopOverlay({ playerData, onBuy, onExpToMoney, onClose }) {
  const money = playerData?.money ?? 0;
  const exp = playerData?.exp ?? 0;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70 pointer-events-auto p-4">
      <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">🛒 Pokémon Shop</h2>
          <div className="flex items-center gap-3">
            <span className="text-yellow-400 font-bold">💰 ${money}</span>
            <span className="text-blue-400 font-bold">⭐ {exp} EXP</span>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
          </div>
        </div>

        {/* EXP → Money conversion */}
        <div className="mb-4 p-3 rounded-lg border-2 border-blue-600 bg-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-white font-bold">Currency Exchange</span>
              <p className="text-slate-400 text-sm">Convert {EXP_TO_MONEY.exp} EXP → ${EXP_TO_MONEY.money}</p>
            </div>
            <button onClick={onExpToMoney} disabled={exp < EXP_TO_MONEY.exp}
              className={`px-4 py-2 rounded-lg font-bold transition-colors ${exp >= EXP_TO_MONEY.exp ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}>
              Exchange
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SHOP_ITEMS.map(item => {
            const currency = item.currency || 'money';
            const balance = currency === 'money' ? money : exp;
            const canAfford = balance >= item.price;
            return (
              <div key={item.id} className={`p-4 rounded-lg border-2 ${canAfford ? 'border-slate-600 bg-slate-700/50' : 'border-slate-800 bg-slate-900/50 opacity-50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-white font-bold">{item.name}</span>
                </div>
                <p className="text-slate-400 text-sm mb-2">{item.desc}</p>
                <button onClick={() => onBuy(item.id)} disabled={!canAfford}
                  className={`w-full py-2 rounded-lg font-bold transition-colors ${\n                    canAfford ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}>
                  {currency === 'money' ? `💰 $${item.price}` : `⭐ ${item.price} EXP`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}