.PHONY: schemas pack install clean

EXT_ID := yrtimer@yrelay.fr

# Output directory for packaged zips
OUT_DIR := ./dist
ZIP := $(OUT_DIR)/$(EXT_ID).shell-extension.zip

# Files and directories to include
BASE_ITEMS := \
  metadata.json \
  extension.js \
  prefs.js \
  prefs_pages \
  ui \
  core \
  schemas \
  stylesheet.css \
  icons \
  icon.png \
  icon.svg

# Optional directories (include only if present)
OPTIONAL_DIRS := sounds locale

# Filter optional dirs that actually exist
EXISTING_OPTIONALS := $(filter $(OPTIONAL_DIRS), $(foreach d,$(OPTIONAL_DIRS),$(if $(wildcard $(d)),$(d),)))

# Final pack list
PACK_ITEMS := $(BASE_ITEMS) $(EXISTING_OPTIONALS)

schemas:
	@echo "Compiling GSettings schemas..."
	glib-compile-schemas schemas/

### Internationalization (i18n)
i18n-init:
	@echo "Initializing i18n structure..."
	@mkdir -p po
	@touch po/yrtimer.pot
	@echo "Done. Edit po/<lang>.po and run 'make i18n-build' to compile."

i18n-update:
	@echo "Updating POT file (requires xgettext)..."
	@mkdir -p po
	@sh -c 'JS_FILES="$$(find . -maxdepth 2 -type f -name "*.js" ! -path "./tests/*")"; \
	if command -v xgettext >/dev/null 2>&1; then \
	  xgettext --from-code=UTF-8 --language=JavaScript --keyword=_ --keyword=N_ \
	    --package-name="yrtimer" --package-version="1" \
	    -o po/yrtimer.pot $$JS_FILES; \
	  if [ -f schemas/org.gnome.shell.extensions.yrtimer.gschema.xml ]; then \
	    xgettext --from-code=UTF-8 --language=Glade --join-existing \
	      -o po/yrtimer.pot schemas/org.gnome.shell.extensions.yrtimer.gschema.xml; \
	  fi; \
	  echo "POT updated: po/yrtimer.pot"; \
	else \
	  echo "xgettext not found; skipping POT update"; \
	fi'

## Build only locales listed in po/LINGUAS if present, otherwise all po/*.po
i18n-build:
	@echo "Building .mo files into locale/... (requires msgfmt)"
	@if ! command -v msgfmt >/dev/null 2>&1; then \
	  echo "msgfmt not found; install gettext"; exit 0; \
	fi
	@LINGUAS_FILE=po/LINGUAS; \
	if [ -f "$$LINGUAS_FILE" ]; then \
	  echo "Using LINGUAS list:"; cat "$$LINGUAS_FILE" | sed 's/^/ - /'; \
	  for LANG in $$(sed 's/#.*//' "$$LINGUAS_FILE" | grep -v '^$$'); do \
	    PO="po/$$LANG.po"; \
	    if [ -f "$$PO" ]; then \
	      OUTDIR=locale/$$LANG/LC_MESSAGES; \
	      mkdir -p "$$OUTDIR"; \
	      echo "Compiling $$PO -> $$OUTDIR/yrtimer.mo"; \
	      msgfmt "$$PO" -o "$$OUTDIR/yrtimer.mo"; \
	    else \
	      echo "[WARN] Missing po file for $$LANG (po/$$LANG.po)"; \
	    fi; \
	  done; \
	else \
	  echo "No LINGUAS file, compiling all po/*.po"; \
	  for PO in po/*.po; do \
	    [ -f "$$PO" ] || continue; \
	    LANG=$$(basename "$$PO" .po); \
	    OUTDIR=locale/$$LANG/LC_MESSAGES; \
	    mkdir -p "$$OUTDIR"; \
	    echo "Compiling $$PO -> $$OUTDIR/yrtimer.mo"; \
	    msgfmt "$$PO" -o "$$OUTDIR/yrtimer.mo"; \
	  done; \
	fi

.PHONY: i18n-report
i18n-report:
	@echo "Locales report (present .po and compiled .mo)"; \
	LINGUAS_FILE=po/LINGUAS; \
	if [ -f "$$LINGUAS_FILE" ]; then \
	  echo "Active locales from LINGUAS:"; cat "$$LINGUAS_FILE" | sed 's/^/ - /'; \
	else \
	  echo "No LINGUAS file found (all po/*.po considered)."; \
	fi; \
	echo "\nPO files:"; ls -1 po/*.po 2>/dev/null | sed 's/^/ - /' || true; \
	echo "\nCompiled MO files:"; find locale -name yrtimer.mo 2>/dev/null | sed 's/^/ - /' || echo " - none"

test:
	@echo "Running GJS unit tests..."
	@if [ -d tests ]; then \
	  for f in tests/*.test.js; do \
	    echo "==> $$f"; \
	    gjs "$$f" || exit 1; \
	  done; \
	else \
	  echo "No tests/ directory found"; \
	fi

pack: schemas i18n-build
	@echo "Packing GNOME Shell extension into $(OUT_DIR)..."
	@mkdir -p $(OUT_DIR)
	zip -r $(ZIP) $(PACK_ITEMS)

install: pack
	@echo "Installing $(ZIP)..."
	gnome-extensions install -f $(ZIP)

# Verify that the installed extension directory contains the compiled .mo files
.PHONY: check-install
check-install:
	@echo "Checking installed extension path and .mo files..."
	@INST_DIR=$$(gnome-extensions info $(EXT_ID) 2>/dev/null | sed -n 's/^.*Chemin: \(.*\)$$/\1/p'); \
	if [ -z "$$INST_DIR" ]; then \
	  echo "Could not determine install path with 'gnome-extensions info $(EXT_ID)'."; exit 1; \
	fi; \
	echo "Installed at: $$INST_DIR"; \
	MO_COUNT=$$(find "$$INST_DIR/locale" -name yrtimer.mo 2>/dev/null | wc -l | tr -d ' '); \
	echo ".mo files found: $$MO_COUNT"; \
	find "$$INST_DIR/locale" -name yrtimer.mo -print 2>/dev/null | sed 's/^/ - /' || true

# Local install by copying sources directly into the extensions directory (ensures .mo presence)
.PHONY: local-install
local-install: schemas i18n-build
	@/bin/sh -c 'set -e; \
	  echo "Performing local install (rsync) into the user extensions directory..."; \
	  INST_DIR=$$(gnome-extensions info $(EXT_ID) 2>/dev/null | sed -n "s/^.*Chemin: \(.*\)$$/\1/p; s/^.*Path: \(.*\)$$/\1/p"); \
	  [ -n "$$INST_DIR" ] || INST_DIR="$$HOME/.local/share/gnome-shell/extensions/$(EXT_ID)"; \
	  echo "Target: $$INST_DIR"; \
	  mkdir -p "$$INST_DIR"; \
	  if command -v rsync >/dev/null 2>&1; then \
	    rsync -a $(PACK_ITEMS) "$$INST_DIR"/; \
	  else \
	    ( tar -cf - $(PACK_ITEMS) ) | ( cd "$$INST_DIR" && tar -xf - ); \
	  fi; \
	  if [ -d "$$INST_DIR/schemas" ]; then \
	    echo "Compiling schemas in $$INST_DIR/schemas ..."; \
	    glib-compile-schemas "$$INST_DIR/schemas" || true; \
	  fi; \
	  ls -la "$$INST_DIR" | sed "s/^/  /"; \
	  echo "Local install done. You may need to reload the shell or toggle the extension."'

clean:
	@echo "Cleaning build artifacts..."
	rm -f $(ZIP)


# --- Convenience targets ---
.PHONY: uninstall reinstall clean-install sync-locales

# Remove the installed extension directory
uninstall:
	@echo "Uninstalling $(EXT_ID) from user directory..."
	@INST_DIR=$$(gnome-extensions info $(EXT_ID) 2>/dev/null | sed -n 's/^.*Chemin: \(.*\)$$/\1/p; s/^.*Path: \(.*\)$$/\1/p'); \
	if [ -z "$$INST_DIR" ]; then \
	  INST_DIR="$$HOME/.local/share/gnome-shell/extensions/$(EXT_ID)"; \
	fi; \
	if [ -d "$$INST_DIR" ]; then \
	  echo "Removing: $$INST_DIR"; \
	  rm -rf "$$INST_DIR"; \
	else \
	  echo "Nothing to remove at $$INST_DIR"; \
	fi

# Full reinstall via packaged zip install
reinstall: uninstall install

# Clean local copy of installed dir, then copy sources directly
clean-install: uninstall local-install

# Ensure locales are up-to-date in the installed directory
sync-locales: i18n-build
	@INST_DIR=$$(gnome-extensions info $(EXT_ID) 2>/dev/null | sed -n 's/^.*Chemin: \(.*\)$$/\1/p; s/^.*Path: \(.*\)$$/\1/p'); \
	if [ -z "$$INST_DIR" ]; then \
	  INST_DIR="$$HOME/.local/share/gnome-shell/extensions/$(EXT_ID)"; \
	fi; \
	echo "Syncing locales to $$INST_DIR/locale/ ..."; \
	mkdir -p "$$INST_DIR/locale"; \
	rsync -a --delete locale/ "$$INST_DIR/locale/"; \
	echo "Locales synchronized."

