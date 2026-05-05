class Cheapcode < Formula
  desc "Substrate-disciplined opencode fork with smart model switchers"
  homepage "https://github.com/MahmoodKhalil57/cheapcode"
  if OS.linux? && Hardware::CPU.intel?
    url "https://github.com/MahmoodKhalil57/cheapcode/releases/download/v1.0.1/cheapcode-1.0.1-linux-x64.tar.gz"
    sha256 "70fe147cc5040824c499b4dc0f8507bace07b5b949e062a2e0f13ecf487d1156"
  else
    odie "prebuilt cheapcode Homebrew artifact is not published for this platform yet"
  end
  version "1.0.1"
  license "MIT"
  head "https://github.com/MahmoodKhalil57/cheapcode.git", branch: "main"

  livecheck do
    url :stable
    strategy :github_latest
  end

  depends_on "node"
  depends_on "ripgrep"

  def install
    if build.head?
      odie "HEAD builds require bun in PATH" unless which("bun")
      odie "HEAD builds require git in PATH" unless which("git")
      system "bun", "install", "--silent"
      odie "HEAD builds require CHEAPCODE_OPENCODE_BIN pointing at a prebuilt cheapcode-opencode binary" unless ENV["CHEAPCODE_OPENCODE_BIN"]
      system "bun", "run", "build:homebrew-artifact"
      artifact = Dir[".release/homebrew/cheapcode-*.tar.gz"].first
      odie "Homebrew artifact build failed" if artifact.nil?
      system "tar", "-xzf", artifact, "-C", buildpath
    end

    libexec.install "lib", "opencode-bin"

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
        rm -rf ~/.config/cheapcode ~/.local/share/cheapcode ~/.cache/cheapcode ~/.local/state/cheapcode

      Packaging note: stable installs use a prebuilt GitHub release artifact and
      do not contact npm during brew install. HEAD builds are developer-only and
      require Bun plus CHEAPCODE_OPENCODE_BIN.

      Upgrade stable installs with:
        brew update && brew upgrade cheapcode

      Upgrade HEAD installs with:
        brew update && brew reinstall --HEAD cheapcode
    EOS
  end

  test do
    assert_match "cheapcode", shell_output("#{bin}/cheapcode version")
  end
end
