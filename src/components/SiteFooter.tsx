export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p>
          <strong>Exvyn</strong>
          <span>Excel + vision — see your workbook clearly</span>
        </p>
        <p className="copyright">© {year} Exvyn. All rights reserved.</p>
      </div>
    </footer>
  )
}
