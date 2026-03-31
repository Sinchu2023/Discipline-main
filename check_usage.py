import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# List of mission related methods/functions
funcs = [
    'syncMissionFromRoadmap',
    'resumeRemoteMission',
    'startMissionLiveLoop',
    '_buildMissionCache',
    '_initMissionDelegation',
    'applyMissionTimeStates',
    'calculateMissionScore',
    'generateMissions',
    'getDailyMissionTasks',
    'getMissionCheckId',
    'getMissionTimeWindow',
    'getTodayManualMissionChecks',
    'renderMissions',
    'updateMissions'
]

unused = []
for func in funcs:
    # Check how many times it appears. 
    # Usually it appears once as declaration, and N times as call.
    # If it only appears once, it's never called.
    matches = re.findall(rf'\b{func}\b', content)
    print(f"{func}: {len(matches)} occurrences")
