import NavBar from "./nav-bar";

// Layout da área logada: barra de navegação fixa no topo em todas as telas.
export default function InicioLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <NavBar />
      {children}
    </>
  );
}
