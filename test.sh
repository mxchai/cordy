echo "=====Testing example.js====="
node run.js example.js
echo "Diff of output"
diff output.js example_output.js

echo

echo "=====Testing write-file-app====="
node run.js ../write-file-app/www/js/index.js
echo "Diff of output"
diff output.js write_file_app_output.js

echo 

echo "=====Testing simple.js====="
node run.js simple.js
