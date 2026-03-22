import re

html = open('index.html', encoding='utf-8').read()

# 1. Drop the massive config/constants block
# We know it starts at "const CONFIG =" and ends after "const STREAK_MESSAGES = {" and its closing "};"
config_start = html.find('const CONFIG =')
if config_start != -1:
    streak_start = html.find('const STREAK_MESSAGES =', config_start)
    if streak_start != -1:
        streak_end = html.find('};', streak_start) + 2
        
        # Replace the entire block with the script tags
        scripts = """<script src="js/config.js"></script>
    <script src="js/constants.js"></script>
    <script src="js/activity-classifier.js"></script>
    <script src="js/sync-manager.js"></script>
    <script src="js/stopwatch-manager.js"></script>
    <script src="js/task-manager.js"></script>
    <script src="js/analytics-service.js"></script>
    <script src="js/ui-manager.js"></script>
    <script src="js/shadow-engine.js"></script>
    <script src="js/trainer-engine.js"></script>
    <script src="js/flow-protocol-engine.js"></script>
    <script src="js/graph-manager.js"></script>
    <script src="js/event-manager.js"></script>
    <script src="js/discipline-tracker.js"></script>
    <script src="js/boot.js"></script>"""
        
        # We need to find the <script> tag that precedes config_start just in case, but actually config_start is just text inside the script. We can just inject at config_start.
        html = html[:config_start] + scripts + html[streak_end:]

# 2. Drop the trailing initialization block
# It looks like:
#       window.classifyActivity = (userInput) =>
#         ActivityClassifier.classify(userInput);
#       window.app = new DisciplineTracker();
#       ...
#       });
#     </script>
tail_start = html.find('window.classifyActivity =')
if tail_start != -1:
    script_end = html.find('</script>', tail_start)
    # the </script> belongs to the main script block
    html = html[:tail_start] + html[script_end:]

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("index.html fully patched.")
