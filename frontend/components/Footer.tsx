export function Footer() {
  return (
    <footer className="border-t py-6 mt-auto">
      <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <p>
          ZEC → ETH Confidential Transfer • Built with{" "}
          <a
            href="https://fhenix.io"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            CoFHE
          </a>{" "}
          &{" "}
          <a
            href="https://iden3.io/circom"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Circom
          </a>
        </p>

        <div className="flex items-center gap-4">
          <a
            href="https://github.com/zec2eth"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            GitHub
          </a>
          <a
            href="https://sepolia.etherscan.io"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            Etherscan
          </a>
        </div>
      </div>
    </footer>
  );
}
