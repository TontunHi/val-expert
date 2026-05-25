import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VAL-Expert | Valorant Agent Mastery Tracker",
  description: "ระบบบันทึกและแสดงข้อมูลความชำนาญการเล่นเอเจนต์ Valorant ของแต่ละคนในแต่ละบทบาท (Duelists, Initiators, Controllers, Sentinels)",
  icons: {
    icon: "https://images.steamusercontent.com/ugc/1009310639741043947/C4780FD7B53B39EFE4A536842FC1281A48A1256F/?imw=268&imh=268&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=true"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>
        <header className="header">
          <div className="container header-container">
            <a href="/" className="logo-link" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img 
                src="https://images.steamusercontent.com/ugc/1009310639741043947/C4780FD7B53B39EFE4A536842FC1281A48A1256F/?imw=268&imh=268&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=true" 
                alt="VAL-Expert Logo" 
                style={{ width: '42px', height: '42px', borderRadius: '6px', border: '1px solid rgba(255, 70, 85, 0.3)', objectFit: 'cover' }}
              />
              <span className="logo-text">
                VAL<span className="logo-sub">-Expert</span>
              </span>
            </a>
            <nav className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <a href="/" className="nav-link">
                Dashboard
              </a>
              <a href="/team-builder" className="nav-link">
                จัดทีมสุ่ม
              </a>
              <a href="/hall-of-fame" className="nav-link">
                ทำเนียบที่สุด
              </a>
              <a href="/users/add" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                เพิ่มผู้เล่นใหม่
              </a>
            </nav>
          </div>
        </header>

        <main className="main-content container">
          {children}
        </main>

        <footer className="footer">
          <div className="container">
            <p>© {new Date().getFullYear()} VAL-Expert. พัฒนาขึ้นเพื่อติดตามความชำนาญของสมาชิกในทีม</p>
            <p style={{ fontSize: '11px', marginTop: '6px', opacity: 0.5 }}>
              VAL-Expert isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

