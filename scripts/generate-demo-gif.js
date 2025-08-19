#!/usr/bin/env node

/**
 * AutoDevOps Demo GIF Generator
 * 
 * This script generates a compelling demo GIF showing AutoDevOps in action.
 * It uses asciinema to record terminal sessions and converts them to GIF.
 * 
 * Usage:
 *   node scripts/generate-demo-gif.js
 * 
 * Requirements:
 *   - asciinema (npm install -g asciinema)
 *   - agg (cargo install --git https://github.com/asciinema/agg)
 *   - or use docker: docker run --rm -v $PWD:/data asciinema/agg
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

class DemoGifGenerator {
  constructor() {
    this.outputDir = path.join(__dirname, '../../../docs');
    this.scriptsDir = path.join(__dirname);
    this.demoScript = path.join(this.scriptsDir, 'demo-script.sh');
    this.asciinemaFile = path.join(this.outputDir, 'demo.cast');
    this.gifFile = path.join(this.outputDir, 'demo.gif');
  }

  // Check if required tools are installed
  checkDependencies() {
    const deps = ['asciinema', 'agg'];
    const missing = [];

    for (const dep of deps) {
      try {
        execSync(`which ${dep}`, { stdio: 'ignore' });
        console.log(`✅ ${dep} found`);
      } catch (error) {
        missing.push(dep);
        console.log(`❌ ${dep} not found`);
      }
    }

    if (missing.length > 0) {
      console.log('\n📋 Install missing dependencies:');
      if (missing.includes('asciinema')) {
        console.log('  npm install -g asciinema');
      }
      if (missing.includes('agg')) {
        console.log('  cargo install --git https://github.com/asciinema/agg');
        console.log('  # or use Docker: docker run --rm -v $PWD:/data asciinema/agg');
      }
      return false;
    }

    return true;
  }

  // Create the demo script that will be recorded
  createDemoScript() {
    const script = `#!/bin/bash

# AutoDevOps Demo Script
# This script demonstrates the key features in an engaging way

# Setup colors for better visual appeal
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
PURPLE='\\033[0;35m'
CYAN='\\033[0;36m'
NC='\\033[0m' # No Color

# Helper function for typing effect
type_command() {
  echo -n "$ "
  for ((i=0; i<\${#1}; i++)); do
    echo -n "\${1:\$i:1}"
    sleep 0.05
  done
  echo
  sleep 0.5
}

# Helper function for simulated output
simulate_output() {
  echo -e "\$1"
  sleep 0.8
}

clear

echo -e "\${PURPLE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    🤖 AutoDevOps Demo                     ║"
echo "║              Fix 47 issues in 12 seconds                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "\${NC}"
echo

sleep 2

# Scenario 1: Initial repo state
echo -e "\${YELLOW}📁 Starting with a messy codebase...\${NC}"
sleep 1

type_command "git status"
simulate_output "\${RED}modified:   src/api.js (linting issues)
modified:   src/auth.py (security vulnerability)  
modified:   README.md (outdated)
modified:   test/unit.js (missing tests)\${NC}"

echo

# Scenario 2: Install AutoDevOps
echo -e "\${CYAN}⚡ Let's fix this with AutoDevOps...\${NC}"
sleep 1

type_command "npx @autodevops/verifier run lint --auto-fix"

# Simulate the magic happening
echo -e "\${BLUE}🔍 Analyzing repository context...\${NC}"
sleep 0.8
echo -e "\${BLUE}🤖 Running Polyglot Linter agent...\${NC}"
sleep 0.5

# Show progress with different file types
files=("src/api.js" "src/auth.py" "src/utils.go" "components/Form.tsx" "styles/main.css")
for file in "\${files[@]}"; do
  echo -e "\${GREEN}  ✅ Fixed \$file\${NC}"
  sleep 0.3
done

echo
simulate_output "\${GREEN}✨ Linter Agent Results:
  • Fixed 23 style issues across 5 languages
  • Standardized 8 import statements  
  • Corrected 12 formatting inconsistencies
  • Time saved: ~45 minutes\${NC}"

echo

# Scenario 3: Security scan
type_command "verifier run security"

echo -e "\${BLUE}🔐 Running Security Scanner agent...\${NC}"
sleep 0.8

simulate_output "\${YELLOW}⚠️  Security Issues Found:
  • Hardcoded API key in src/auth.py (CRITICAL)
  • SQL injection risk in src/api.js (HIGH)
  • Weak password validation (MEDIUM)\${NC}"

sleep 1

simulate_output "\${GREEN}🛡️  Auto-applying security fixes...
  ✅ Moved API key to environment variables
  ✅ Added SQL parameterization
  ✅ Enhanced password requirements
  • Time saved: ~30 minutes\${NC}"

echo

# Scenario 4: Documentation update
type_command "verifier run docs"

echo -e "\${BLUE}📚 Running Documentation Updater agent...\${NC}"
sleep 0.8

simulate_output "\${GREEN}📝 Documentation Updates:
  ✅ Updated README.md with new API endpoints
  ✅ Generated JSDoc comments for 15 functions
  ✅ Synced CHANGELOG.md with recent commits
  • Time saved: ~2 hours\${NC}"

echo

# Scenario 5: Test generation
type_command "verifier run tests"

echo -e "\${BLUE}🧪 Running Test Generator agent...\${NC}"
sleep 0.8

simulate_output "\${GREEN}🎯 Test Generation Complete:
  ✅ Created 12 unit tests for new functions
  ✅ Added 5 integration tests for API endpoints
  ✅ Generated edge case tests for auth module
  • Coverage increased: 67% → 89%
  • Time saved: ~3 hours\${NC}"

echo

# Final summary
echo -e "\${PURPLE}📊 Total Results Summary:\${NC}"
echo -e "\${GREEN}╔══════════════════════════════════════════════╗"
echo -e "║  🎯 47 issues fixed automatically            ║"
echo -e "║  ⏱️  Total time saved: 6 hours 15 minutes    ║"
echo -e "║  💰 Estimated cost: \$0.23 in AI tokens       ║"
echo -e "║  🚀 Your PR is now ready for review!        ║"
echo -e "╚══════════════════════════════════════════════╝\${NC}"

echo
echo -e "\${CYAN}Ready to try AutoDevOps? → npx @autodevops/verifier init\${NC}"
sleep 3

# End with a clean state
echo
echo -e "\${YELLOW}Demo complete! 🎉\${NC}"
sleep 2
`;

    fs.writeFileSync(this.demoScript, script);
    fs.chmodSync(this.demoScript, '755');
    console.log(`✅ Created demo script: ${this.demoScript}`);
  }

  // Record the demo using asciinema
  recordDemo() {
    console.log('🎬 Recording demo with asciinema...');
    
    try {
      execSync(`asciinema rec ${this.asciinemaFile} --command "${this.demoScript}" --overwrite`, {
        stdio: 'inherit'
      });
      console.log(`✅ Recording saved: ${this.asciinemaFile}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to record demo:', error.message);
      return false;
    }
  }

  // Convert asciinema recording to GIF
  convertToGif() {
    console.log('🎨 Converting to GIF...');

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    try {
      // Use agg to convert with optimized settings for web
      execSync(`agg ${this.asciinemaFile} ${this.gifFile} --speed 1.5 --fps 12 --theme monokai`, {
        stdio: 'inherit'
      });
      
      const stats = fs.statSync(this.gifFile);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      console.log(`✅ GIF created: ${this.gifFile}`);
      console.log(`📏 File size: ${fileSizeMB} MB`);
      
      // If file is too large, create a compressed version
      if (stats.size > 5 * 1024 * 1024) { // 5MB
        console.log('🗜️  Creating compressed version...');
        const compressedGif = this.gifFile.replace('.gif', '-compressed.gif');
        execSync(`agg ${this.asciinemaFile} ${compressedGif} --speed 2 --fps 8`, {
          stdio: 'inherit'
        });
        console.log(`✅ Compressed GIF: ${compressedGif}`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to convert to GIF:', error.message);
      console.log('💡 Try using Docker: docker run --rm -v $(pwd):/data asciinema/agg /data/docs/demo.cast /data/docs/demo.gif');
      return false;
    }
  }

  // Generate usage instructions
  generateInstructions() {
    const instructions = `# AutoDevOps Demo GIF

This directory contains the demo GIF and related files for AutoDevOps.

## Files
- \`demo.gif\` - Main demo GIF for README
- \`demo.cast\` - Source asciinema recording
- \`demo-compressed.gif\` - Compressed version (if original > 5MB)

## Regenerating the Demo

1. Install dependencies:
   \`\`\`bash
   npm install -g asciinema
   cargo install --git https://github.com/asciinema/agg
   \`\`\`

2. Run the generator:
   \`\`\`bash
   cd packages/verifier
   node scripts/generate-demo-gif.js
   \`\`\`

## Using in Documentation

Embed in README.md:
\`\`\`markdown
![AutoDevOps Demo](./docs/demo.gif)
\`\`\`

## Customization

Edit \`scripts/generate-demo-gif.js\` to:
- Change demo scenarios
- Adjust timing and colors  
- Modify output settings
- Add new agent demonstrations

## Tips for Great Demos

- Keep it under 30 seconds for README
- Show real value (time saved, issues fixed)
- Use realistic but impressive numbers
- Include multiple programming languages
- End with a clear call-to-action
`;

    const instructionsFile = path.join(this.outputDir, 'README.md');
    fs.writeFileSync(instructionsFile, instructions);
    console.log(`✅ Generated instructions: ${instructionsFile}`);
  }

  // Main execution flow
  async run() {
    console.log('🚀 AutoDevOps Demo GIF Generator\n');

    // Check dependencies
    if (!this.checkDependencies()) {
      console.log('\n❌ Please install missing dependencies and try again.');
      process.exit(1);
    }

    console.log('\n📝 Setting up demo...');
    
    // Create demo script
    this.createDemoScript();
    
    // Record the demo
    console.log('\n🎬 Starting recording (this will run the demo script)...');
    if (!this.recordDemo()) {
      process.exit(1);
    }

    // Convert to GIF
    console.log('\n🎨 Converting to GIF...');
    if (!this.convertToGif()) {
      process.exit(1);
    }

    // Generate documentation
    this.generateInstructions();

    console.log('\n🎉 Demo GIF generation complete!');
    console.log(`\n📁 Files created:`);
    console.log(`   ${this.gifFile}`);
    console.log(`   ${this.asciinemaFile}`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Review the GIF in your browser`);
    console.log(`   2. Update README.md image path if needed`);
    console.log(`   3. Commit the new demo files`);
    console.log(`\n🌟 Your README now has instant developer gratification!`);
  }
}

// Run the generator
if (require.main === module) {
  const generator = new DemoGifGenerator();
  generator.run().catch(console.error);
}

module.exports = DemoGifGenerator;