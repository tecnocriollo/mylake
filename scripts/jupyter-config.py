# Jupyter Server Configuration for MyLake
# Allows embedding in iframes from the frontend

c = get_config()

# Server settings for newer Jupyter versions
c.ServerApp.token = 'mylake-token-123'
c.ServerApp.password = ''
c.ServerApp.allow_origin = '*'
c.ServerApp.allow_remote_access = True
c.ServerApp.disable_check_xsrf = True
c.ServerApp.allow_hosts = ['*']
c.ServerApp.trust_xheaders = True

# Also set for NotebookApp backward compatibility
c.NotebookApp.token = 'mylake-token-123'
c.NotebookApp.password = ''
c.NotebookApp.allow_origin = '*'
c.NotebookApp.allow_remote_access = True
c.NotebookApp.disable_check_xsrf = True

# Frame embedding - CRITICAL for iframe support
# Use both ServerApp and NotebookApp tornado settings
c.ServerApp.tornado_settings = {
    'headers': {
        'Content-Security-Policy': "frame-ancestors *",
        'X-Frame-Options': 'ALLOWALL',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Credentials': 'true',
    },
}

c.NotebookApp.tornado_settings = {
    'headers': {
        'Content-Security-Policy': "frame-ancestors *",
        'X-Frame-Options': 'ALLOWALL',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Credentials': 'true',
    },
}

# WebSocket and base settings
c.ServerApp.base_url = '/'
c.ServerApp.root_dir = '/home/jovyan'
c.NotebookApp.base_url = '/'
c.NotebookApp.notebook_dir = '/home/jovyan'

# PySpark settings
import os
os.environ['SPARK_OPTS'] = '--driver-memory=2g --executor-memory=2g'
