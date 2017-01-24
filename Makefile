all: linuxbrew-lambda.zip

git-2.4.3.tar:
	curl -O https://raw.githubusercontent.com/lambci/lambci/master/vendor/git-2.4.3.tar
	gsha256sum -c $@.sha256 || sha256sum -c $@.sha256

traveling-ruby-20150715-2.2.2-linux-x86_64.tar.gz:
	curl -O http://d6r77u77i8pq3.cloudfront.net/releases/traveling-ruby-20150715-2.2.2-linux-x86_64.tar.gz
	gsha256sum -c $@.sha256 || sha256sum -c $@.sha256

brew-stamp:
	git clone --depth=1 https://github.com/Linuxbrew/brew
	git clone --depth=1 https://github.com/Linuxbrew/homebrew-core brew/Library/Taps/homebrew/homebrew-core
	git clone --depth=1 https://github.com/Linuxbrew/homebrew-developer brew/Library/Taps/linuxbrew/homebrew-developer
	git clone --depth=1 https://github.com/Linuxbrew/homebrew-test-bot brew/Library/Taps/linuxbrew/homebrew-test-bot
	git clone https://github.com/Linuxbrew/homebrew-extra brew/Library/Taps/linuxbrew/homebrew-extra
	touch $@

ruby-stamp: traveling-ruby-20150715-2.2.2-linux-x86_64.tar.gz
	tar xf $<
	touch $@

linuxbrew-lambda.zip: brew-stamp ruby-stamp git-2.4.3.tar index.js brew bin bin.real info lib
	zip -qr $@ $^
