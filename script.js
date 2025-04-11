
document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'https://67e8524420e3af747c40fddb.mockapi.io/tasks';
    
    
    const taskForm = document.getElementById('taskForm');
    const taskInput = document.getElementById('taskInput');
    const taskDetails = document.getElementById('taskDetails');
    const taskPriority = document.getElementById('taskPriority');
    const taskStatus = document.getElementById('taskStatus');
    const taskLists = {
        'to-do': document.getElementById('toDoTasks'),
        'in-progress': document.getElementById('inProgressTasks'),
        'completed': document.getElementById('completedTasks'),
        'deleted': document.getElementById('deletedTasks')
    };

    let tasks = [];

    
    taskForm.addEventListener('submit', handleSubmit);
    document.addEventListener('click', handleActions);
    document.getElementById('taskSearch').addEventListener('input', filterTasks);
    document.getElementById('taskFilter').addEventListener('change', filterTasks);
    document.getElementById('priorityFilter').addEventListener('change', filterTasks);
    document.getElementById('statusFilter').addEventListener('change', filterTasks);
    document.getElementById('clearAllBtn').addEventListener('click', clearAllTasks);

    
    fetchTasks();

    async function fetchTasks() {
        try {
            const response = await fetch(API_URL);
            const apiTasks = await response.json();
            
            tasks = apiTasks.map(task => ({
                id: task.id,
                title: task.title,
                details: task.description || task.details || '',
                priority: task.priority?.toLowerCase() || 'medium',
                status: convertStatus(task.status),
                createdAt: task.createdAt
            }));
            
            renderTasks(tasks);
            updateTaskCounts(tasks);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    }

    function convertStatus(apiStatus) {
        const statusMap = {
            'inProgressTasks': 'in-progress',
            'toDoTasks': 'to-do',
            'completedTasks': 'completed',
            'deleted': 'deleted'
        };
        return statusMap[apiStatus] || apiStatus?.toLowerCase() || 'to-do';
    }

    function renderTasks(tasks) {
        Object.values(taskLists).forEach(list => {
            list.innerHTML = '<li class="text-white/50 text-center py-4">No tasks</li>';
        });

        tasks.forEach(task => {
            const taskElement = createTaskElement(task);
            const status = task.status || 'to-do';
            const targetList = taskLists[status];

            if (targetList.children[0]?.textContent === 'No tasks') {
                targetList.innerHTML = '';
            }
            
            targetList.appendChild(taskElement);
        });
    }

    function createTaskElement(task) {
        const taskElement = document.createElement('li');
        taskElement.className = `task-item panel-style rounded p-4 fade-in task-priority-${task.priority}`;
        taskElement.dataset.taskId = task.id;
        taskElement.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <h3 class="font-semibold text-white">${task.title}</h3>
                <div class="flex space-x-2">
                    <button class="edit-btn text-blue-400 hover:text-blue-300" data-action="edit">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="delete-btn ${task.status === 'deleted' ? 'text-green-400' : 'text-red-400'} hover:opacity-75" 
                            data-action="${task.status === 'deleted' ? 'restore' : 'delete'}">
                        ${task.status === 'deleted' ? 
                            '<i class="fas fa-trash-restore"></i>' : 
                            '<i class="fas fa-trash"></i>'}
                    </button>
                </div>
            </div>
            ${task.details ? `<p class="text-white/70 text-sm mb-2">${task.details}</p>` : ''}
            <div class="flex justify-between items-center text-xs">
                <span class="px-2 py-1 rounded ${getPriorityClass(task.priority)}">
                    ${task.priority.toUpperCase()}
                </span>
                ${task.status !== 'deleted' ? `
                <select class="status-select panel-style text-xs px-2 py-1 rounded">
                    <option value="to-do" ${task.status === 'to-do' ? 'selected' : ''}>To Do</option>
                    <option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                    <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
                </select>
                ` : ''}
            </div>
        `;

        const statusSelect = taskElement.querySelector('.status-select');
        if (statusSelect) {
            statusSelect.addEventListener('change', async (e) => {
                await updateTask(task.id, {status: e.target.value});
                fetchTasks();
            });
        }

        return taskElement;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        
        if (!taskInput.value.trim()) return;

        const newTask = {
            title: taskInput.value.trim(),
            description: taskDetails.value.trim(),
            priority: taskPriority.value,
            status: taskStatus.value,
            createdAt: new Date().toISOString()
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newTask)
            });
            
            if (!response.ok) throw new Error('Failed to create task');
            
            taskForm.reset();
            await fetchTasks();
        } catch (error) {
            console.error('Error creating task:', error);
            alert('Failed to create task. Please try again.');
        }
    }

    async function handleActions(e) {
        const taskElement = e.target.closest('.task-item');
        if (!taskElement) return;
    
        const taskId = taskElement.dataset.taskId;
        const action = e.target.closest('button')?.dataset.action;

        try {
            if (action === 'delete') {
                await updateTask(taskId, { status: 'deleted' });
            } 
            else if (action === 'restore') {
                await updateTask(taskId, { status: 'to-do' });
            } 
            else if (action === 'edit') {
                const task = tasks.find(t => t.id === taskId);
                showEditModal(task);
            }
            await fetchTasks();
        } catch (error) {
            console.error('Error handling action:', error);
            alert('Operation failed. Please try again.');
        }
    }

    async function updateTask(id, updates) {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });
            return await response.json();
        } catch (error) {
            console.error('Error updating task:', error);
            throw error;
        }
    }

    function showEditModal(task) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50';
        modal.innerHTML = `
            <div class="panel-style rounded-lg p-6 w-full max-w-md animate-fade-in">
                <h2 class="text-xl font-bold mb-4 text-white">Edit Task</h2>
                <form id="editForm" class="space-y-4">
                    <input type="text" id="editTitle" value="${task.title}" 
                        class="panel-style p-2 rounded w-full text-white" required>
                    
                    <textarea id="editDetails" 
                        class="panel-style p-2 rounded w-full min-h-[100px] text-white"
                        placeholder="Task details">${task.details || ''}</textarea>
                    
                    <select id="editPriority" class="panel-style p-2 rounded w-full text-white">
                        ${['low', 'medium', 'high', 'urgent'].map(opt => `
                            <option value="${opt}" ${task.priority === opt ? 'selected' : ''}>
                                ${opt.charAt(0).toUpperCase() + opt.slice(1)} Priority
                            </option>
                        `).join('')}
                    </select>
                    
                    <div class="flex justify-end space-x-3">
                        <button type="button" class="cancel-edit px-4 py-2 hover:bg-white/10 rounded text-white">
                            Cancel
                        </button>
                        <button type="submit" 
                            class="px-4 py-2 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30">
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        `;

        modal.querySelector('#editForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const updates = {
                    title: modal.querySelector('#editTitle').value.trim(),
                    description: modal.querySelector('#editDetails').value.trim(),
                    priority: modal.querySelector('#editPriority').value
                };
                
                if (!updates.title) {
                    alert('Task title is required');
                    return;
                }

                await updateTask(task.id, updates);
                modal.remove();
                await fetchTasks();
            } catch (error) {
                console.error('Error updating task:', error);
                alert('Failed to update task. Please try again.');
            }
        });

        modal.querySelector('.cancel-edit').addEventListener('click', () => modal.remove());
        document.body.appendChild(modal);
    }

    function filterTasks() {
        const searchTerm = document.getElementById('taskSearch').value.toLowerCase();
        const statusFilter = document.getElementById('taskFilter').value;
        const priorityFilter = document.getElementById('priorityFilter').value;
        const statusTypeFilter = document.getElementById('statusFilter').value;

        const filtered = tasks.filter(task => {
            const matchesSearch = task.title.toLowerCase().includes(searchTerm) ||
                                task.details?.toLowerCase().includes(searchTerm);
            const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
            const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
            const matchesStatusType = statusTypeFilter === 'all' || task.status === statusTypeFilter;

            return matchesSearch && matchesStatus && matchesPriority && matchesStatusType;
        });

        renderTasks(filtered);
        updateTaskCounts(filtered);
    }

    async function clearAllTasks() {
        if (!confirm('Are you sure you want to delete ALL tasks?')) return;
        
        try {
            const deletePromises = tasks.map(task => 
                fetch(`${API_URL}/${task.id}`, { method: 'DELETE' })
            );
            
            await Promise.all(deletePromises);
            await fetchTasks();
        } catch (error) {
            console.error('Error clearing tasks:', error);
            alert('Failed to clear tasks. Please try again.');
        }
    }

    function getPriorityClass(priority) {
        const classes = {
            low: 'bg-blue-500/20 text-blue-400',
            medium: 'bg-yellow-500/20 text-yellow-400',
            high: 'bg-orange-500/20 text-orange-400',
            urgent: 'bg-red-500/20 text-red-400'
        };
        return classes[priority] || classes.medium;
    }

    function updateTaskCounts(tasks) {
        const counters = {
            'to-do': 0,
            'in-progress': 0,
            'completed': 0,
            'deleted': 0
        };

        tasks.forEach(task => counters[task.status]++);
        
        Object.entries(counters).forEach(([status, count]) => {
            document.querySelectorAll(`.task-count[data-type="${status}"]`)
                .forEach(el => el.textContent = count);
        });
        
        const totalTasks = tasks.length;
        document.querySelectorAll('#taskSummary, #mobileTaskSummary').forEach(el => {
            el.textContent = `${totalTasks} task${totalTasks !== 1 ? 's' : ''}`;
        });
        
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateString = new Date().toLocaleDateString('en-US', options);
        document.querySelectorAll('#dateDisplay, #mobileDateDisplay').forEach(el => {
            el.textContent = dateString;
        });
    }
});