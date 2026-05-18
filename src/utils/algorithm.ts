import { Settlement } from "../types";

export function calculateSettlements(
  balances: { personId: string; balance: number }[]
): Settlement[] {
  const settlements: Settlement[] = [];
  
  // Create a deep copy to not mutate the input
  let debtMap = balances.map(b => ({ ...b }));

  // Separate debtors and creditors
  let debtors = debtMap
    .filter(b => b.balance < -0.01)
    .sort((a, b) => a.balance - b.balance); // Most negative first
    
  let creditors = debtMap
    .filter(b => b.balance > 0.01)
    .sort((a, b) => b.balance - a.balance); // Most positive first

  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(-debtors[i].balance, creditors[j].balance);
    
    if (amount > 0.01) {
      settlements.push({
        from: debtors[i].personId,
        to: creditors[j].personId,
        amount: Number(amount.toFixed(2))
      });
    }

    debtors[i].balance += amount;
    creditors[j].balance -= amount;

    if (Math.abs(debtors[i].balance) < 0.01) i++;
    if (Math.abs(creditors[j].balance) < 0.01) j++;
  }

  return settlements;
}
