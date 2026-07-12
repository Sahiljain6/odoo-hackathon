export default function KpiCard({ label, value }) {
  return (
    <div className="kpi">
      <div className="val">{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}
