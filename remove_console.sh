#!/bin/bash

# Remove all console statements from TypeScript/JavaScript files
find src -name "*.ts" -o -name "*.tsx" | while read file; do
    echo "Processing: $file"
    
    # Remove console.log statements
    sed -i 's/console\.log([^)]*);//g' "$file"
    
    # Remove console.error statements  
    sed -i 's/console\.error([^)]*);//g' "$file"
    
    # Remove console.warn statements
    sed -i 's/console\.warn([^)]*);//g' "$file"
    
    # Remove console.info statements
    sed -i 's/console\.info([^)]*);//g' "$file"
    
    # Remove console.debug statements
    sed -i 's/console\.debug([^)]*);//g' "$file"
    
    echo "Cleaned: $file"
done

echo "Console statements removed from all files!"
