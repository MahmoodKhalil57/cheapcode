class Cheapcode < Formula
  desc "Substrate-disciplined opencode fork with smart model switchers"
  homepage "https://github.com/MahmoodKhalil57/cheapcode"
  url "https://github.com/MahmoodKhalil57/cheapcode.git", branch: "main"
  version "1.0.0"
  license "MIT"
  head "https://github.com/MahmoodKhalil57/cheapcode.git", branch: "main"

  livecheck do
    url :stable
    strategy :github_latest
  end

  depends_on "node"
  depends_on "ripgrep"
  depends_on "bun" => :build
  depends_on "git" => :build

  resource "opencode" do
    url "https://github.com/MahmoodKhalil57/opencode.git", revision: "d5171dbe412e9da932bebf177ceefec1b293a9da"
  end

  def install
    system "bun", "install", "--silent"
    system "bun", "run", "build:npm"

    resource("opencode").stage do
      (buildpath/"opencode-src").install Dir["*"]
    end
    cd buildpath/"opencode-src" do
      system "bun", "install", "--silent"
      system "bun", "run", "--cwd", "packages/opencode", "build", "--single"
    end

    opencode_binary = Dir["#{buildpath}/opencode-src/packages/opencode/dist/opencode-*/bin/opencode"].first
    odie "opencode binary build failed" if opencode_binary.nil?
    (libexec/"opencode-bin").install opencode_binary => "opencode"

    cd buildpath/".release/npm" do
      system "npm", "install", *std_npm_args
    end

    %w[cheapcode cheapcode-accounts cheapcode-account-status cheapcode-accounts-mcp].each do |command|
      write_homebrew_wrapper(command)
    end
  end

  def write_homebrew_wrapper(command)
    (bin/command).write <<~SH
      #!/bin/bash
      export CHEAPCODE_OPENCODE_BIN="#{libexec}/opencode-bin/opencode"
      export CHEAPCODE_HOMEBREW="1"
      exec "#{Formula["node"].opt_bin}/node" "#{libexec}/lib/node_modules/cheapcode-ai/dist/bin/#{command}.js" "$@"
    SH
    chmod 0755, bin/command
  end

  def caveats
    <<~EOS
      cheapcode's managed code is installed under:
        #{opt_libexec}

      First run will create user state under ~/.config/cheapcode and
      ~/.local/share/cheapcode as needed for provider config and auth.

      Start the browser UI:
        cheapcode web

      Homebrew uninstall removes the Cellar files and bin wrappers. To remove
      user config/auth/cache too, run:
        brew uninstall --zap cheapcode

      Packaging note: this formula currently depends on Bun because cheapcode
      and its opencode fork are installed from source. The vanilla-opencode-like
      target is a published npm tarball with node + ripgrep only.

      Upgrade stable installs with:
        brew update && brew upgrade cheapcode

      Upgrade HEAD installs with:
        brew update && brew reinstall --HEAD cheapcode
    EOS
  end

  test do
    assert_match "cheapcode", shell_output("#{bin}/cheapcode version")
  end

  zap trash: [
    "~/.config/cheapcode",
    "~/.local/share/cheapcode",
    "~/.cache/cheapcode",
    "~/.local/state/cheapcode",
  ]
end
