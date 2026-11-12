{
  description = "warren's website";

  inputs.nixpkgs.url = "https://flakehub.com/f/NixOS/nixpkgs/0.1";

  outputs = { nixpkgs, ... }:
    let
      forEachSystem = f: nixpkgs.lib.genAttrs
        [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ]
        (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forEachSystem (pkgs: {
        # ffmpeg is for scripts/clip.sh
        default = pkgs.mkShell { packages = with pkgs; [ nodejs pnpm ffmpeg ]; };
      });
    };
}
