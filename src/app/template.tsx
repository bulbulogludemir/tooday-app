export default function Template({
  children,
}: {
  children: React.ReactNode;
}) {
  // re-mounts on every route change -> gentle crossfade between views
  return <div className="page-in">{children}</div>;
}
