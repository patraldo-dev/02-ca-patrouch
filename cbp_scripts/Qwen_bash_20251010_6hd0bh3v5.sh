# Dry run: preview changes (remove -n and p to actually apply)
grep -rl "Ex Libris" . | xargs sed -n 's/Ex Libris/Ex Libris/gp'

# Apply changes (BACK UP FIRST!)
grep -rl "Ex Libris" . | xargs sed -i 's/Ex Libris/Ex Libris/g'