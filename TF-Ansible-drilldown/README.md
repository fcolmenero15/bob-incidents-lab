# Terraform & Ansible Drill-down

See the recorded demo video [here](https://ibm.box.com/s/syxz6h8t4hv64z47f5uo1uygowmhqxpw)

## Demo flow
1. `Please explain the @bank--app`
    - Bob reads the application files and explains the application
    - If not generated automatically, you can prompt him to generate diagrams to explain the application stack
2. `What Ansible playbooks are available in this repo?`
    - Bob reads and summarizes the Ansible playbooks
3. `How does the health check work?`
    - Bob explains the health check in more depth, likely with diagramming
4. `Please document the health check playbook using markdown`
    - Bob will write to a new .md file to document the playbook
5. `What is the ansible-collections mcp server?`
    - This add-on is specifically to target the Ansible use case where organizations have custom collections for roles and modules stored remotely that should be used for development
    - The idea is that Bob (through the MCP server), knows what custom assets are available, can pull more information on them, and even download them to your directory for development
    - This step requires additional setup of the MCP server from this repo and remote access to it: https://github.ibm.com/Liam-Patty/ansible-collections-mcp. 
6. `Is there a custom module for extracting data from json? If so please download it to my repo`
    - Bob will search the remote repo and download the example `json_query.py` module to the repo
7. `How is terraform configured for this app?`
    - Bob explains how Terraform is used to manage the app
8. `How can you help with Ansible and Terraform development?`
    - Bob explains capabilities, typically focusing on the Ansible and Terraform MCP tooling that is configured in this repo
9. `Please describe the SDLC incident manager mode`
    - Bob describes the SDLC incident manager mode, which was build specifically for running this workflow consistently. It is defined in `.bob/` with additional XML rules if you want to double click into custom modes
10. Start the application with `@deploy-initial.sh`
11. In the UI, log in, perform a couple operations to show quick & responsive UI
12. Simulate the traffic overload issue with `@setup-flow.sh`
13. Go back to localhost and demonstrate the latency
14. Ask Bob `Our users are reporting ~3s latency accessing the bank application`
15. Approve and explain as Bob diagnoses root cause with Ansible health check and tracks the incident in ServiceNow
16. Before applying the TF changes, ask Bob `please explain the Terraform plan with diagramming`
    - Bob will explain his proposed TF solution with natural language and diagrams to compare infrastructure changes visually
17. Apply the changes, show the application issue resovled by navigating back the website and demonstrating returned responsiveness
18. After Bob closes the ServiceNow incident, have Bob provide the link so that you can show the ticket and all update documentation Bob made along the way