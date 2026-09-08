#!/usr/bin/env python3
"""
Import Fixing Script

This script fixes all import statements after the component reorganization
using the patterns from the reorganization report.
"""

import json
import re
from pathlib import Path
from typing import Dict, List

class ImportFixer:
    def __init__(self, src_root: str, report_file: str):
        self.src_root = Path(src_root)
        self.report_file = report_file
        self.import_patterns = {}
        self.fixed_files = []
        self.load_import_patterns()
    
    def load_import_patterns(self):
        """Load import patterns from the reorganization report."""
        try:
            with open(self.report_file, 'r', encoding='utf-8') as f:
                report = json.load(f)
            self.import_patterns = report.get('import_patterns', {})
            print(f"📋 Loaded {len(self.import_patterns)} import patterns from {self.report_file}")
        except Exception as e:
            print(f"❌ Error loading report: {e}")
    
    def fix_file_imports(self, file_path: Path) -> bool:
        """Fix imports in a single file."""
        if not file_path.exists() or file_path.suffix not in ['.tsx', '.ts']:
            return False
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            changes_made = 0
            
            # Apply each import pattern
            for old_pattern, new_pattern in self.import_patterns.items():
                # Create a regex pattern that matches the import statement
                # Handle both single and double quotes
                old_pattern_single = old_pattern.replace("'", "'")
                old_pattern_double = old_pattern.replace("'", '"')
                
                if old_pattern_single in content:
                    content = content.replace(old_pattern_single, new_pattern)
                    changes_made += 1
                    print(f"   🔧 Fixed: {old_pattern_single} → {new_pattern}")
                
                if old_pattern_double in content:
                    content = content.replace(old_pattern_double, new_pattern.replace("'", '"'))
                    changes_made += 1
                    new_pattern_double = new_pattern.replace("'", '"')
                    print(f"   🔧 Fixed: {old_pattern_double} → {new_pattern_double}")
            
            # Additional specific fixes for our reorganization
            additional_fixes = [
                # Fix RoundFlowManagement imports
                (r"import\s+.*\s+from\s+['\"]\.\.\/tournament\/RoundFlowManagement['\"]", 
                 lambda m: m.group(0).replace('../tournament/RoundFlowManagement', '../event/flow/RoundFlowManagement')),
                
                # Fix TournamentFlowDiagram imports
                (r"import\s+.*\s+from\s+['\"]\.\.\/tournament\/TournamentFlowDiagram['\"]", 
                 lambda m: m.group(0).replace('../tournament/TournamentFlowDiagram', '../event/flow/TournamentFlowDiagram')),
                
                # Fix nodes imports
                (r"from\s+['\"]\.\.\/tournament\/nodes\/(\w+)['\"]", 
                 r"from '../event/flow/nodes/\1'"),
                
                # Fix edges imports
                (r"from\s+['\"]\.\.\/tournament\/edges\/(\w+)['\"]", 
                 r"from '../event/flow/edges/\1'"),
                
                # Fix utils imports
                (r"from\s+['\"]\.\.\/tournament\/utils\/(\w+)['\"]", 
                 r"from '../event/flow/utils/\1'"),
                
                # Fix round relationship imports
                (r"from\s+['\"]\.\.\/tournament\/(RoundRelationship\w+)['\"]", 
                 r"from '../round/relationships/\1'"),
                
                # Fix squad manager imports
                (r"from\s+['\"]\.\.\/tournaments\/SquadScoreManager['\"]", 
                 r"from '../squad/SquadScoreManager'"),
            ]
            
            for pattern, replacement in additional_fixes:
                if callable(replacement):
                    content = re.sub(pattern, replacement, content)
                else:
                    new_content = re.sub(pattern, replacement, content)
                    if new_content != content:
                        changes_made += 1
                        content = new_content
            
            # Write back if changes were made
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                self.fixed_files.append(str(file_path))
                return True
            
        except Exception as e:
            print(f"❌ Error fixing {file_path}: {e}")
            return False
        
        return False
    
    def fix_all_imports(self):
        """Fix imports in all TypeScript/React files."""
        print("🚀 Starting import fixing...")
        print("=" * 60)
        
        # Find all .tsx and .ts files
        file_patterns = ['**/*.tsx', '**/*.ts']
        files_to_fix = []
        
        for pattern in file_patterns:
            files_to_fix.extend(self.src_root.glob(pattern))
        
        # Filter out node_modules and other irrelevant directories
        files_to_fix = [
            f for f in files_to_fix 
            if 'node_modules' not in str(f) and 'dist' not in str(f) and 'build' not in str(f)
        ]
        
        print(f"📁 Found {len(files_to_fix)} TypeScript/React files to check")
        
        fixed_count = 0
        for file_path in files_to_fix:
            relative_path = file_path.relative_to(self.src_root)
            print(f"\n📄 Checking: {relative_path}")
            
            if self.fix_file_imports(file_path):
                fixed_count += 1
                print(f"   ✅ Fixed imports in {relative_path}")
            else:
                print(f"   ⏭️  No changes needed in {relative_path}")
        
        print(f"\n📊 IMPORT FIXING SUMMARY:")
        print(f"   • Files checked: {len(files_to_fix)}")
        print(f"   • Files fixed: {fixed_count}")
        print(f"   • No changes needed: {len(files_to_fix) - fixed_count}")
        
        if fixed_count > 0:
            print(f"\n✅ Import fixing completed successfully!")
            print(f"📋 Fixed files saved to: import_fix_report.json")
            self.save_fix_report()
        else:
            print(f"\n✅ All imports were already correct!")
    
    def save_fix_report(self):
        """Save a report of all fixed files."""
        report = {
            "summary": {
                "total_files_checked": len(self.fixed_files),
                "files_fixed": len(self.fixed_files)
            },
            "fixed_files": self.fixed_files,
            "patterns_applied": list(self.import_patterns.keys())
        }
        
        with open("import_fix_report.json", 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

def main():
    """Main execution function."""
    script_dir = Path(__file__).parent
    src_dir = script_dir / "src"
    report_file = script_dir / "reorganization_report_v2.json"
    
    if not src_dir.exists():
        print(f"❌ Source directory not found: {src_dir}")
        return
        
    if not report_file.exists():
        print(f"❌ Reorganization report not found: {report_file}")
        print("   Please run the reorganization script first.")
        return
    
    print(f"🎯 Fixing imports in: {src_dir}")
    print(f"📋 Using report: {report_file}")
    
    fixer = ImportFixer(str(src_dir), str(report_file))
    
    try:
        fixer.fix_all_imports()
        print("\n🎉 Import fixing process completed!")
        
    except Exception as e:
        print(f"❌ Error during import fixing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 