export default function StatusBadge({ status }) {
  const cls = 'b-' + status.toLowerCase().replace(/\s/g, '');
  return <span className={`badge ${cls}`}>{status}</span>;
}
