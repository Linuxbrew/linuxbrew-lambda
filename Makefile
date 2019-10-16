all: linuxbrew-lambda.zip

clean:
	rm -rf brew brew-stamp ruby-stamp

deploy: linuxbrew-lambda.zip.json

.PHONY: all clean deploy
.DELETE_ON_ERROR:
.SECONDARY:

git-2.4.3.tar: git-2.4.3.tar.sha256
	curl -fO https://raw.githubusercontent.com/lambci/lambci/v0.9.14/vendor/git-2.4.3.tar
	sha256sum -c $<

portable-ruby-%.x86_64_linux.bottle.tar.gz: portable-ruby-%.x86_64_linux.bottle.tar.gz.sha256
	curl -fL -o $@ https://linuxbrew.bintray.com/bottles-portable-ruby/portable-ruby--$*.x86_64_linux.bottle.tar.gz
	sha256sum -c $<

brew-stamp:
	git clone --depth=1 https://github.com/Homebrew/brew
	git clone --depth=1 https://github.com/Homebrew/homebrew-test-bot brew/Library/Taps/homebrew/homebrew-test-bot
	git clone --depth=1 https://github.com/Linuxbrew/homebrew-developer brew/Library/Taps/linuxbrew/homebrew-developer
	git clone --depth=50 https://github.com/Homebrew/linuxbrew-core brew/Library/Taps/homebrew/homebrew-core
	git clone --depth=50 https://github.com/Linuxbrew/homebrew-extra brew/Library/Taps/linuxbrew/homebrew-extra
	git clone --depth=50 https://github.com/Linuxbrew/homebrew-xorg brew/Library/Taps/linuxbrew/homebrew-xorg
	git clone --depth=50 https://github.com/brewsci/homebrew-base brew/Library/Taps/brewsci/homebrew-base
	git clone --depth=50 https://github.com/brewsci/homebrew-bio brew/Library/Taps/brewsci/homebrew-bio
	git clone --depth=50 https://github.com/brewsci/homebrew-num brew/Library/Taps/brewsci/homebrew-num
	touch $@

# Also modify index.js when increasing this version number.
RUBY_VERSION=2.6.3
ruby-stamp: portable-ruby-$(RUBY_VERSION).x86_64_linux.bottle.tar.gz
	tar -C brew/Library/Homebrew/vendor -xf $<
	chmod u+w brew/Library/Homebrew/vendor/portable-ruby/$(RUBY_VERSION)/bin/ruby
	gstrip brew/Library/Homebrew/vendor/portable-ruby/$(RUBY_VERSION)/bin/ruby || strip brew/Library/Homebrew/vendor/portable-ruby/$(RUBY_VERSION)/bin/ruby
	chmod u-w brew/Library/Homebrew/vendor/portable-ruby/$(RUBY_VERSION)/bin/ruby
	rm -f brew/Library/Homebrew/vendor/portable-ruby/$(RUBY_VERSION)/lib/libruby-static.a
	touch $@

linuxbrew-lambda.zip: git-2.4.3.tar index.js brew-stamp ruby-stamp
	rm -f $@
	zip -qr $@ git-2.4.3.tar index.js bin brew

linuxbrew-lambda.zip.json: linuxbrew-lambda.zip
	aws lambda update-function-code --function-name LinuxbrewTestBot --zip-file fileb://$< >$@

linuxbrew-lambda.test.output.json: linuxbrew-lambda.test.json
	curl -fd@$< https://p4142ivuwk.execute-api.us-west-2.amazonaws.com/prod/LinuxbrewTestBot?keep-old=1 >$@

%.kms.base64: %
	aws kms encrypt --key-id alias/LinuxbrewTestBot --plaintext fileb://$< --query CiphertextBlob --output text >$@

%.kms.bin: %.kms.base64
	base64 --decode $< >$@

%.kms.plain: %.kms.bin
	aws kms decrypt --ciphertext-blob fileb://$< --query Plaintext --output text | base64 --decode >$@
